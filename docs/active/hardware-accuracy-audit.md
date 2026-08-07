# Hardware accuracy audit — core ICs

**Date:** 2026-08-06 · **Scope:** every emulated IC in `src/core/` + `wasm-cpu/src/`, checked
against manufacturer documentation and the Apple 1 hardware description.

> **Status: all findings closed.** Fixed on branch `fix/hw-accuracy` as LCD work-item
> `hw-accuracy` (`docs/lcd/work/hw-accuracy/`), which carries the acceptance criteria, plan and
> task breakdown. The summary table's Status column records where each finding landed. Three
> deviations were kept deliberately and are listed under "Intentional deviations" — they are
> decisions, not omissions.

This was a findings document. Each finding records what the real
part does, what we do, how it was measured, which engine is affected, and whether real Apple 1
software can observe it.

## Method

Claims were not taken from memory. Two kinds of evidence back every entry:

- **Measured.** A throwaway Vitest probe drove the actual emulator and printed real values
  against datasheet-expected ones. Probe output is quoted verbatim in each finding.
- **Sourced.** Behaviour of the real part comes from the documents listed at the bottom, not
  from assumption. Where sources disagree or I could not find a primary statement, the finding
  says so rather than guessing.

The WASM core was audited by reading `wasm-cpu/src/` for the same defect classes found in the
JS core. It cannot be exercised under Node (see `docs/active/cpu_test_guidelines.md`), so those
entries are code-read, not measured — marked accordingly.

## Summary, ranked by whether Apple 1 software can observe it

| #   | IC       | Finding                                                                                                                                                                | JS  | WASM        | Observable?                 | Status |
| --- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ----------- | --------------------------- | --- |
| 1   | PIA 6820 | Powers up pre-initialised (`CRB=$04`, `DDRB=$7F`) instead of all-zero, so WOZMON's `STY $D012` writes to ORB and pushes a spurious `$7F` at the display on every reset | ✗   | ✗ (shared)  | Yes — every reset           | fixed · AC-1..3 |
| 2   | PIA 6820 | Reading Data Register A clears only IRQA1; the datasheet clears IRQA1 **and** IRQA2                                                                                    | ✗   | ✗ (shared)  | Yes, if CA2 interrupts used | fixed · AC-4 |
| 3   | PIA 6820 | Reading the _DDR_ also clears IRQA1; on real hardware a DDR read touches no flags                                                                                      | ✗?  | ✗? (shared) | Yes, if CA2/DDR paths used  | fixed · AC-5 |
| 4   | 6502     | Decimal mode is not implemented at all in the Rust core — ADC/SBC ignore the D flag                                                                                    | ok  | ✗           | Yes — engines disagree      | fixed · AC-6 |
| 5   | 6502     | JS `(zp,X)` does not wrap the pointer inside zero page                                                                                                                 | ✗   | ok          | Only at pointer `$FF`       | fixed · AC-7 |
| 6   | 6502     | JS `JMP (ind)` implements the page bug on the wrong operand, and misses the real one                                                                                   | ✗   | ok          | Only at page-edge vectors   | fixed · AC-8 |
| 7   | 6502     | JS `BRK` clears D — that is 65C02 behaviour; NMOS 6502 leaves D alone                                                                                                  | ✗   | ok          | Yes, if BRK used in decimal | fixed · AC-9 |
| 8   | 6502     | Store/RMW indexed instructions charge a conditional page-cross cycle; real ones are fixed-cost                                                                         | ✗   | ok          | Timing only                 | fixed · AC-10 |
| 9   | 6502     | Reset clears A/X/Y and sets S=$FF; real reset leaves A/X/Y alone and decrements S by 3                                                                                 | ✗   | ✗           | Rarely                      | fixed · AC-12 |
| 10  | 6502     | NMI triggers on the _release_ edge, not the assertion edge                                                                                                             | ✗   | n/a         | Not on Apple 1 (NMI unused) | fixed · AC-13 |
| 11  | 6502     | Six illegal RMW opcodes write the wrong value back to memory; `ANC` is wrong outright                                                                                  | ✗   | absent      | No                          | fixed · AC-14 |
| 12  | Bus      | Exact-range decode — no PIA mirroring across `$D000-$DFFF`; unmapped reads return `$00`                                                                                | ✗   | partial     | Yes, for mirror-using code  | fixed · AC-15/16 |
| 13  | Terminal | Display handshake is faked via a synthetic PB7 setter; the real CB2-output/CB1-pulse path is unimplemented (`TODO` in PIA6820)                                         | ✗   | ✗ (shared)  | Timing/structure            | fixed · AC-17 |
| 14  | Terminal | Accepts ASCII 32–126, so lowercase renders; the 2513 is a 64-glyph uppercase-only ROM                                                                                  | ✗   | ✗ (shared)  | Yes, for lowercase output   | fixed · AC-11 |
| 15  | RAM      | Powers up all zeros; real DRAM powers up with indeterminate contents                                                                                                   | ✗   | ✗           | No                          | kept · D-012 |

Legend: ✗ = deviates, ✗? = deviates under the standard reading of the datasheet, but I could not
confirm it in a primary source (see Open questions), ok = matches the real part, "shared" = the
WASM bus delegates I/O to the same JS component so the finding applies to both engines.

---

## 1. PIA 6820/6821

Everything in this section applies to both engines: `wasm-cpu/src/bus.rs:88` routes
`$D010-$D013` back into JavaScript via `bus_read`/`bus_write`, so `src/core/PIA6820.ts` is the
only PIA in the project.

### 1.1 Power-on state is the post-initialisation state (finding 1)

The datasheet is unambiguous: the RES line "is used to reset all registers in the PIA to a
logical zero." Our constructor and `resetState()` instead seed:

```ts
this.ddrb = 0x7f; // src/core/PIA6820.ts:137, :589
this.cra = 0x04; // bit 2 = access Output Register, not DDR
this.crb = 0x04;
```

That is the state WOZMON _produces_, pre-applied. The consequence is not cosmetic. The ROM
bytes in `src/apple1/progs/woz_monitor.ts` decode to:

```asm
FF00  D8        CLD
FF01  58        CLI
FF02  A0 7F     LDY #$7F
FF04  8C 12 D0  STY $D012     ; intended: DDRB := $7F
FF07  A9 A7     LDA #$A7
FF09  8D 11 D0  STA $D011     ; CRA
FF0C  8D 13 D0  STA $D013     ; CRB
```

`STY $D012` only reaches DDRB when CRB bit 2 is clear. Because we pre-set `crb = 0x04`, the
write takes the output-register branch in `write()` and calls `ioB.write(0x7f)`. Measured:

```text
P1 after WOZMON init: DDRB=$7F ORB=$7F ioB writes=[$7f]
P3 power-on: CRA=$04 CRB=$04 DDRA=$00 DDRB=$7F
```

So every reset sends character `$7F` to the display logic, and DDRB is only correct because it
was pre-seeded — the ROM's actual attempt to set it never lands. This also masks a whole class
of initialisation bugs: any program that relies on the documented all-zero reset state will
behave differently here.

### 1.2 Reading Data Register A clears the wrong set of flags (findings 2 and 3)

Per the datasheet, both IRQA1 (CRA bit 7) and IRQA2 (CRA bit 6) are cleared by an MPU read of
Peripheral Data Register A. `read()` clears only bit 7 (`src/core/PIA6820.ts:190`):

```text
P2 CRA before=$d7 after DRA read=$57
```

`$D7 → $57` clears bit 7 and leaves bit 6 (`$40`) set. Both should clear.

Separately, the flag clear happens _before_ the DDR/output-register branch, so it fires even
when CRA bit 2 selects the DDR — a read that on real hardware touches no interrupt flag at all:

```text
P2b CRA before=$93 after DDRA read=$13
```

### 1.3 Input port lines read the output register, not the pins

A 6821 read of a line programmed as an input returns the pin level; the output register is
invisible on those lines. `readPortA()` returns `this.ora | 0x80`, so a software write to ORA
shows up on a port programmed entirely as input:

```text
P4 DRA read after writing $41 to ORA with DDRA=$00: $c1
```

This one is a deliberate modelling shortcut rather than an accident — `KeyboardLogic` injects
keystrokes by writing ORA (`src/apple1/KeyboardLogic.ts:27`) because there is no pin-level
model. It works for the Apple 1 wiring (Port A is all-input, PA7 strapped high) but it is not
6821 behaviour, and it is why finding 1 has teeth: register semantics are being used as a
side channel.

### 1.4 CA2/CB2 output modes are unimplemented

`updateCA2Output()` and `updateCB2Output()` are empty with a `TODO` (`src/core/PIA6820.ts:796`).
On the real Apple 1 this is not an optional corner — see finding 13.

---

## 2. 6502 CPU — JS engine

All measured. Probe values quoted verbatim.

### 2.1 `(zp,X)` pointer does not wrap in zero page (finding 5)

`addressing.ts:17` reads the pointer high byte at `a + 1` with no mask, while `izy` two lines
down correctly does `(a + 1) & 0xff`. With a pointer base of `$FF` the real chip reads the high
byte from `$0000`; we read `$0100`.

```text
A izx wrap: A=$22 (spec $11 from $1234 / bug $22 from $AB34)
```

The Rust core gets this right (`instructions_with_bus.rs:32` — `addr` is a `u8`, so
`wrapping_add(1)` stays in page zero). Engine divergence.

### 2.2 `JMP (ind)` implements the page bug on the wrong fetch (finding 6)

`addressing.ts:41` applies a page-wrap to the _operand_ fetch from PC:

```ts
a |= this.read((this.PC & 0xff00) | ((this.PC + 1) & 0xff)) << 8; // wrong fetch
this.addr |= this.read(a + 1) << 8; // missing wrap here
```

The real bug is on the pointer dereference, not the operand. Both halves measured wrong:

```text
B1 JMP(ind) ptr wrap: PC=$8000 (spec $4000, no-bug $8000)
B2 JMP(ind) operand fetch: PC=$5500 (spec $4400, wrapped $5500)
```

6502.org states the rule plainly: with a vector at `$30FF` the high byte comes from `$3000`.
The Rust core implements exactly this (`instructions_bus_impl.rs:342`). Engine divergence.

Worth noting: WOZMON's run command is `6C 24 00` — `JMP ($0024)`. The vector is not page-edge,
so the bug is not triggered in practice, but the instruction is on the hot path.

### 2.3 `BRK` clears the decimal flag (finding 7)

Measured `D BRK: D=0`. `instructions.ts:274` does `this.D = 0`. Per 6502.org, that is the 65C02
difference: on the NMOS 6502 a BRK, IRQ or NMI does not affect D. The Rust `brk_bus`
(`instructions_bus_impl.rs:377`) correctly leaves D alone. Engine divergence.

### 2.4 Store and RMW indexed instructions use conditional timing (finding 8)

Real store instructions always pay the extra cycle — the CPU cannot know whether to fix up the
high byte until it has done the dummy write. Measured, with no page crossing:

```text
C cycles: STA abs,X=4(spec 5) STA abs,Y=4(spec 5) STA (zp),Y=5(spec 6)
          ASL abs,X=6(spec 7) LDA abs,X=4(spec 4)
```

Only the load is right. The cause is that `abx`/`aby`/`izy` in `addressing.ts` add the
page-cross cycle conditionally and are shared by loads and stores alike. The Rust core hard-codes
5 for `impl_store_absx` and 6 for `sta_izy_bus`, which is correct. Engine divergence, and it
means the two engines report different cycle totals for the same program — relevant because the
`Clock` provisions work by cycle count.

### 2.5 Reset does too much (finding 9)

```text
E reset: A=$0 X=$0 Y=$0 S=$ff D=0 cycles=0
         (spec: A/X/Y unchanged, S=$80-3=$7D, D undefined, ~7 cycles)
```

The real sequence performs three fake stack reads, so S ends at its previous value minus 3
(`$FD` from a cold `$00`), leaves A/X/Y untouched, leaves D undefined, and costs cycles. We zero
the registers, force `S=$FF`, and charge nothing. Both engines share this deviation
(`cpu.rs:95-102` does the same), so it is at least consistent — and WOZMON's first instruction
is `CLD`, which is precisely the defensive coding that exists because D is undefined after
reset.

### 2.6 NMI edge polarity is inverted (finding 10)

```text
H NMI: pending after assert=0, after release=1
```

`core.ts:643` latches on `previousNmi && !state` — the release edge. Given `setNmi(true)` means
"asserted", the latch should be on the assertion edge. Not reachable on the Apple 1 (nothing
drives NMI), so this is latent rather than active.

### 2.7 Illegal RMW opcodes write the wrong value back (finding 11)

The opcode table pairs `slo`/`rla`/`sre`/`rra`/`dcp`/`isc` with `rmw()`, which writes `this.tmp`
to memory. But the instruction bodies leave `tmp` holding the _accumulator_ result rather than
the modified memory value — and `rla`/`rra` operate on `A` instead of memory entirely.

```text
F SLO $10: mem[$10]=$81 A=$81 — spec mem=$80 A=$81
F RLA $10: mem[$10]=$1e A=$1e — spec mem=$80 A=$00
F SRE $10: mem[$10]=$e  A=$e  — spec mem=$01 A=$0e
F RRA $10: mem[$10]=$8  A=$8  — spec mem=$01 A=$11
F DCP $10: mem[$10]=$1  A=$5  — spec mem=$04 A=$05 C=1
F ISC $10: mem[$10]=$1  A=$a  — spec mem=$06 A=$0a
```

`ANC` is separately wrong — it never ANDs A with the operand at all (`instructions.ts:465`):

```text
G ANC #$FF with A=$0F: A=$ff C=0 (spec A=$0F, C=N=0)
```

No Apple 1 software executes these. This is the low-priority tail of the list, and it is the
mechanical explanation for the illegal-opcode divergences already noted in the project's
engine-parity fuzz caveat.

---

## 3. 6502 CPU — WASM engine

Code-read, not measured.

### 3.1 Decimal mode is absent (finding 4)

`flags::DECIMAL` exists and `SED`/`CLD` set and clear it (`instructions_bus_impl.rs:424`, `:430`),
but nothing ever reads it. `adc_bus` and `sbc_bus` (`instructions_with_bus.rs:112`, `:129`) are
pure binary. The JS engine implements full NMOS decimal semantics including the
binary-derived N/V/Z flags.

This is the largest correctness gap in the WASM core and a direct violation of the project's
stated dual-engine parity invariant: `SED; LDA #$09; CLC; ADC #$01` yields `$10` on JS and `$0A`
on WASM.

### 3.2 Illegal opcodes are largely unimplemented

Ten dispatch arms are commented out in `opcodes_with_bus.rs`, and the `_ =>` fallback charges 2
cycles and continues (`opcodes_with_bus.rs:245`). The JS engine implements roughly eighteen. Given
section 2.7, "JS implements them wrongly, WASM not at all" is the honest characterisation — this
is a parity gap in both directions and neither side is a reference.

### 3.3 What the Rust core gets right that JS does not

Worth stating explicitly, because the project treats the JS engine as the reference oracle: on
`(zp,X)` wrap, `JMP (ind)`, `BRK`/D, and store/RMW cycle counts, **the Rust core is the more
accurate of the two**. Any parity work should port Rust's behaviour into JS, not the reverse.

### 3.4 Interrupt timing

Both engines poll interrupts before the opcode fetch (`cpu.rs:123`, `core.ts:356`) rather than
during the penultimate cycle of the preceding instruction. Neither models the one-instruction
delay after `CLI`/`SEI`, nor the branch-timing interrupt quirks. Consistent between engines and
not observable on this machine; recording it for completeness.

---

## 4. Bus and address decoding (finding 12)

The Apple 1 decodes addresses partially: the PIA repeats through the whole of `$D000-$DFFF`.
Our `Bus` maps exact ranges and `validate()` actively rejects overlapping mappings
(`src/core/Bus.ts:111`), so mirroring cannot be expressed in the current design.

```text
BU1 mirrors: $D010=$80  $D014=$0  $D110=$0  unmapped $C000=$0
```

Real hardware would return the PIA at `$D014` and `$D110`. Unmapped reads also return `$00`;
a floating bus reads back the last value on it, conventionally modelled as `$FF` or as the
high byte of the address. The Rust bus already returns `0xFF` for unmapped and unconnected
regions (`bus.rs:78`, `:95`) — another quiet divergence between the two engines.

The RAM/ROM sizes and base addresses themselves are right: 4K at `$0000`, 4K at `$E000`, 256
bytes of ROM at `$FF00`, PIA at `$D010`.

---

## 5. RAM and ROM

Both engines fill RAM with zeros on construction and reset — `src/core/RAM.ts:101`, `:155` and
`wasm-cpu/src/ram.rs:25` (`vec![0; size]`). Real Apple 1 DRAM comes up with indeterminate
contents. Low impact — WOZMON does not depend on it — but it does mean the emulator never
reproduces the class of bugs that only appear on uninitialised memory (finding 15). Note this is
the one place the two engines agree on a fill value: for _unmapped_ addresses they do not (§4).

`ROM.write()` logs a warning and discards the write (`src/core/ROM.ts:217`), which is correct
behaviour for a ROM on a shared bus.

---

## 6. Clock

`CPU_SPEED_MHZ = 1` (`src/apple1/constants/system.ts:7`). Sources disagree slightly: several
Apple 1 references give 1.023 MHz (the NTSC-derived 14.31818 MHz ÷ 14, the same as the Apple II),
while sbprojects describes it as "1 MHz derived from the terminal circuitry". The difference is
about 2%, and the in-app clock is throttle-locked anyway, so this is a fidelity nit rather than
a defect. Flagging it as **worth confirming against the actual schematic** rather than asserting
either number.

---

## 7. Terminal section

The real terminal is not a frame buffer. Characters live in six 2504 recirculating shift
registers, and the processor must wait a full 16.7 ms video field before the target position
comes round again — roughly 60 characters per second.

### 7.1 The character rate is right; the comment is wrong

`DISPLAY_DELAY_MS = 17` is a good match for one field per character. The trailing comment
`// ~300 baud equivalent` is wrong — 300 baud is about 30 characters per second, half the rate.
Same stale comment in `src/apple1/const.ts:15`. Cosmetic, but it is the kind of thing that
misleads the next reader into "correcting" a value that was already right.

The neighbouring `DISPLAY_PROCESSING_TIME_US = 500` in the same file is dead — grepped, nothing
imports it. It documents a 500 µs figure that contradicts the 16.7 ms field time the hardware
actually imposes, so it should be deleted rather than wired up.

### 7.2 The handshake mechanism is faked (finding 13)

On real hardware, writing a character clears the PIA's CB2 _output_, which drives PB7 high;
a 3.5 µs pulse on CB1 releases it. We model none of that — `DisplayLogic` calls a synthetic
`pia.setPB7DisplayStatus()` (`src/apple1/DisplayLogic.ts:35`, `:41`) that pokes a private field,
while the CB2 output logic the real path depends on is the empty `TODO` from section 1.4.

The functional result is close, but the busy window is governed by the host event loop rather
than emulated time. Measured:

```text
D1 PB7 busy during host-async display write=true, after completion=false
```

Busy is observable, which is what makes WOZMON's `$FFF2` poll loop terminate — but its duration
is however long a JS microtask plus the `Clock`'s inter-chunk `await` happens to take, not
16.7 ms of emulated time. Speed up or slow down the host and the emulated handshake timing moves
with it.

### 7.3 Character set is too permissive (finding 14)

`WebCRTVideo.write()` masks to 7 bits (correct), but `onChar` accepts the full printable ASCII
range 32–126 (`src/apple1/WebCRTVideo.ts:162`). The 2513 holds 64 glyphs and cannot display
lowercase; the Apple 1 ignores ASCII bit 5 and inverts bit 6, folding lowercase to uppercase.
Sending `a` shows a lowercase `a` here and an uppercase `A` on real hardware.

40×24 geometry and the scroll-by-shifting behaviour are correct.

---

## 8. Keyboard

`KeyboardLogic.write()` pulses CA1 low→high→low inside a single synchronous call
(`src/apple1/KeyboardLogic.ts:36-40`). The transition is latched, so the interrupt flag is set
correctly, but the strobe is never observable as a _level_ — on real hardware it stays asserted
until the keyboard data register is read. Nothing in WOZMON reads the level, so this is latent.

Two `console.log` calls remain in this file (lines 17, 19, 47), which violate the project's own
rule 5. Unrelated to hardware accuracy but worth sweeping while the file is open.

---

## Intentional deviations — not bugs

- `CONFIG.CRT_SUPPORT_BS` — backspace handling the real terminal lacks. A deliberate usability
  choice.
- `applyState()` force-clears PB7 after a state load (`src/core/PIA6820.ts:516`), with a comment
  explaining why: a snapshot taken mid-write would otherwise hang the ECHO loop forever. Correct
  engineering, documented, not hardware behaviour.
- `KeyboardLogic` injecting via ORA rather than pins — see 1.3. Reasonable given no pin model,
  but it is what makes finding 1 consequential.

## Open questions

- Apple 1 CPU clock: 1.0 or 1.023 MHz? Needs the schematic, not secondary sources.
- Whether the 6821's IRQ flag clear fires on a read of the _output_ register specifically, or on
  any access decoded to that address. Sources say "Peripheral Data Register"; our DDR-read case
  (finding 3) assumes the former, which is the standard reading but I did not find it stated
  negatively in a primary document.

## Fix order used

1. PIA reset state (findings 1–3) — one component, highest observability, and it currently masks
   other init bugs. Needs care: fixing the power-on state means WOZMON's `STY $D012` starts
   landing in DDRB, which changes the display-write path.
2. WASM decimal mode (finding 4) — closes the biggest parity gap.
3. JS CPU correctness: `(zp,X)` wrap, `JMP (ind)`, `BRK`/D (findings 5–7). Port the Rust
   behaviour across; small, well-covered by the probes above.
4. Store/RMW cycle counts (finding 8) — needs the addressing modes split into read and write
   variants, so it is the largest mechanical change.
5. Terminal character set and the stale baud comment (finding 14) — cheap.
6. Everything else is latent or cosmetic.

Each finding has a real test in `src/**/__tests__/` rather than the throwaway probes used here —
17 acceptance criteria across five files, plus a system-level boot test. The Rust core cannot be
reached by `yarn test:ci`, so its decimal mode and undocumented instruction set were verified by
driving `WasmSystem` in a browser; those results are recorded in the work-item JOURNAL.

One outcome worth noting beyond the findings list: with the undocumented set implemented, the
Rust dispatch covers all 256 opcodes, and the compiler now enforces that — the wildcard arm that
silently charged 2 cycles for an unimplemented opcode is gone.

## Sources

- [6502.org — 6502 opcodes, cycle counts and the JMP indirect bug](http://www.6502.org/tutorials/6502opcodes.html)
- [6502.org — 65C02 opcodes (BRK and the decimal flag difference)](https://6502.org/tutorials/65c02opcodes.html)
- [pagetable.com — Internals of BRK/IRQ/NMI/RESET on a MOS 6502](https://www.pagetable.com/?p=410)
- [MC6820 PIA hardware manual (Apple 1 archive copy)](https://www.axdn.com/apple1/6820_hardware_manual.pdf)
- [Rockwell R6520 PIA datasheet](https://6502.org/documents/datasheets/rockwell/rockwell_r6520_pia.pdf)
- [SB-Projects — Apple 1 terminal section](https://www.sbprojects.net/projects/apple1/terminal.php)
- [SB-Projects — Apple 1 system overview](https://www.sbprojects.net/projects/apple1/a1block.php)
- [Apple-1 Operation Manual, 1976](https://s3data.computerhistory.org/brochures/apple.applei.1976.102646518.pdf)
- In-repo primary source: `src/apple1/progs/woz_monitor.ts` (WOZMON ROM bytes)
