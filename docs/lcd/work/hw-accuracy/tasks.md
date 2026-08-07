# Tasks: Core IC hardware accuracy

> **Deep lane · Phase 3 of 6 (Tasks).** A flat, dependency-ordered checklist. Each task names
> the file it touches. Tests come before the code they test (TDD). The granular STEPS in the
> work-item `JOURNAL.md` mirror this list as the resume view; keep them in sync.

**Slug:** `hw-accuracy`
**Spec:** [`spec.md`](./spec.md) • **Plan:** [`plan.md`](./plan.md) • **Journal:** [`JOURNAL.md`](./JOURNAL.md)
**Created:** 2026-08-06
**Status:** in_progress <!-- in_progress | completed | abandoned -->

---

## Conventions

- `[P]` suffix = parallelizable with the previous task (different file, no shared state).
- Tests precede implementation tasks they cover.
- One file per task where possible; tasks naming multiple files should be split unless the change is genuinely atomic.
- **Browser-verification tasks are not optional.** Per the project's invariants the Rust core cannot
  be exercised by `yarn test:ci`, so T11, T34 and the boot check T8 are the only proof those
  changes work. A green suite does not cover them.
- Tiers land in order and each ends green. T1–T8 (the PIA) lands **alone** before T9 starts, because
  it moves the boot path.

## Tasks

### Tier 1 — PIA power-on state and interrupt flags (AC-1…AC-5)

- [ ] **T1**: Write failing test named `AC-1 (none): PIA powers up with all registers zero` in `src/core/__tests__/PIA6820-hw-accuracy.vitest.test.ts` — asserts both control, both direction and both output registers read zero after construction and after reset
- [ ] **T2**: Write failing test named `AC-2 (none): monitor port-B direction write reaches DDRB` in `src/core/__tests__/PIA6820-hw-accuracy.vitest.test.ts` — from power-on, writing `$7F` to the port-B address stores into DDRB and triggers no port-B output write
- [ ] **T3**: Write failing test named `AC-4 (none): reading data register A clears both interrupt flags` in `src/core/__tests__/PIA6820-hw-accuracy.vitest.test.ts`
- [ ] **T4**: Write failing test named `AC-5 (none): reading the direction register clears no interrupt flag` in `src/core/__tests__/PIA6820-hw-accuracy.vitest.test.ts`
- [ ] **T5** [P]: Write failing test named `AC-3 (RENDER): monitor startup emits no character` in `src/apple1/__tests__/DisplayLogic-hw-accuracy.vitest.test.ts` — drives the monitor's reset sequence against a wired display and asserts nothing was written
- [ ] **T6**: Modify `src/core/PIA6820.ts` — zero the register seeds in the constructor and `resetState()`; move the interrupt-flag clear inside the data-register branch of `read()` and clear both flags. Passes T1–T5
- [ ] **T7**: Modify `src/core/__tests__/PIA6820.vitest.test.ts` — the case resting on "control registers are already initialized to 0x04" now sets them explicitly
- [ ] **T8**: Browser verification — boot the app, confirm the monitor prompt appears, keyboard input echoes, and no stray character precedes the prompt. Drive via in-page JS (the emulator loop never reaches `document_idle`)

### Tier 2 — Decimal mode in the Rust core (AC-6)

- [ ] **T9**: Write failing test named `AC-6 (none): decimal add and subtract follow BCD on both engines` in `src/core/__tests__/CPU6502-hw-accuracy.vitest.test.ts` — asserts the TypeScript engine directly; the Rust half `skipIf`s in Node per the project's WASM test convention, and is covered by T11
- [ ] **T10**: Modify `wasm-cpu/src/instructions_with_bus.rs` — add the decimal branch to `adc_bus` and `sbc_bus`, mirroring the TypeScript NMOS semantics (BCD result and carry; N/Z/V from the binary result)
- [ ] **T11**: Run `yarn wasm:check`, then browser-verify decimal arithmetic on the Rust engine — switch engines at runtime and confirm the same BCD results as the TypeScript engine

### Tier 3 — TypeScript CPU correctness (AC-7…AC-9)

- [ ] **T12**: Write failing test named `AC-7 (none): indexed-indirect pointer wraps in zero page` in `src/core/__tests__/CPU6502-hw-accuracy.vitest.test.ts`
- [ ] **T13**: Write failing test named `AC-8 (none): indirect jump reproduces the page-boundary vector bug` in `src/core/__tests__/CPU6502-hw-accuracy.vitest.test.ts` — covers both the pointer dereference and the operand fetch
- [ ] **T14**: Write failing test named `AC-9 (none): software interrupt leaves the decimal flag alone` in `src/core/__tests__/CPU6502-hw-accuracy.vitest.test.ts`
- [ ] **T15**: Modify `src/core/cpu6502/addressing.ts` — wrap the indexed-indirect pointer high byte inside zero page; move the page-boundary bug off the operand fetch and onto the pointer dereference. Passes T12, T13
- [ ] **T16**: Modify `src/core/cpu6502/instructions.ts` — stop clearing the decimal flag in the software-interrupt instruction. Passes T14

### Tier 4 — Store and read-modify-write cycle counts (AC-10)

- [ ] **T17**: Write failing test named `AC-10 (none): indexed stores and RMW cost a fixed cycle count` in `src/core/__tests__/CPU6502-hw-accuracy.vitest.test.ts` — pins the published counts with and without a page crossing
- [ ] **T18**: Modify `src/core/cpu6502/addressing.ts` — add the fixed-cost siblings `abxw`, `abyw`, `izyw`
- [ ] **T19**: Modify `src/core/cpu6502/types.ts` — declare the three siblings on the CPU interface
- [ ] **T20**: Modify `src/core/cpu6502/core.ts` — delegate the three siblings from the CPU class
- [ ] **T21**: Modify `src/core/cpu6502/opcodes.ts` — repoint every writing opcode (stores, RMW, and the undocumented RMW forms) at the fixed-cost siblings. Passes T17

### Tier 5 — Terminal character set (AC-11)

- [ ] **T22**: Write failing test named `AC-11 (RENDER): characters fold into the 64-glyph uppercase repertoire` in `src/apple1/__tests__/WebCRTVideo-hw-accuracy.vitest.test.ts` — lowercase folds to uppercase and no lowercase glyph is ever stored
- [ ] **T23**: Modify `src/apple1/WebCRTVideo.ts` — fold incoming characters into the 64-glyph repertoire the way the original character generator does. Passes T22
- [ ] **T24**: Browser verification — type lowercase at the prompt and confirm uppercase renders

### Tier 6 — Latent and cosmetic tail (AC-12…AC-17)

- [ ] **T25**: Write failing test named `AC-12 (none): reset preserves registers and decrements the stack pointer by three` in `src/core/__tests__/CPU6502-hw-accuracy.vitest.test.ts`
- [ ] **T26**: Modify `src/core/cpu6502/core.ts` — reset leaves accumulator, index registers and decimal flag untouched and decrements the stack pointer by three. Passes T25
- [ ] **T27** [P]: Modify `wasm-cpu/src/cpu.rs` — same reset semantics in the Rust core
- [ ] **T28**: Write failing test named `AC-13 (none): non-maskable interrupt latches on the assertion edge` in `src/core/__tests__/CPU6502-hw-accuracy.vitest.test.ts`
- [ ] **T29**: Modify `src/core/cpu6502/core.ts` — latch the non-maskable interrupt on assertion rather than release. Passes T28
- [ ] **T30**: Write failing test named `AC-14 (none): undocumented read-modify-write instructions write back the memory result` in `src/core/__tests__/CPU6502-hw-accuracy.vitest.test.ts` — one case per instruction, plus the accumulator-and-immediate instruction
- [ ] **T31**: Modify `src/core/cpu6502/instructions.ts` — correct the write-back value in each undocumented read-modify-write instruction and fix the accumulator-and-immediate instruction. Passes T30
- [ ] **T32**: Modify `wasm-cpu/src/instructions_bus_impl.rs` — implement the undocumented instruction set in the Rust core, including decimal variants
- [ ] **T33**: Modify `wasm-cpu/src/opcodes_with_bus.rs` — wire the dispatch arms for the undocumented opcodes
- [ ] **T34**: Run `yarn wasm:check`, then browser-verify the undocumented instruction set produces identical register, flag and memory state on both engines. **This is the only proof T32/T33 work**
- [ ] **T35**: Write failing test named `AC-15 (none): the PIA answers throughout its mirrored region` in `src/core/__tests__/Bus-hw-accuracy.vitest.test.ts`
- [ ] **T36**: Modify `src/core/types/` (bus space type) — add the optional offset mask field
- [ ] **T37**: Modify `src/core/Bus.ts` — apply the mask when computing the decoded offset
- [ ] **T38**: Modify `src/apple1/index.ts` — widen the PIA mapping to the mirrored region and set its mask. Passes T35
- [ ] **T39** [P]: Modify `wasm-cpu/src/bus.rs` — widen the IO region to match, so the Rust engine forwards mirrored addresses
- [ ] **T40**: Write failing test named `AC-16 (none): an unanswered address reads the floating-bus value` in `src/core/__tests__/Bus-hw-accuracy.vitest.test.ts`
- [ ] **T41**: Modify `src/core/Bus.ts` — return the floating-bus value for an unmapped read, matching the Rust core. Passes T40
- [ ] **T42**: Modify `src/core/__tests__/Bus.vitest.test.ts` — update the case asserting `0` for a non-existent address space
- [ ] **T43**: Write failing test named `AC-17 (RENDER): display busy is held for emulated time` in `src/apple1/__tests__/DisplayLogic-hw-accuracy.vitest.test.ts` — busy stays asserted until the emulated cycle deadline passes and does not depend on host scheduling
- [ ] **T44**: Modify `src/apple1/DisplayLogic.ts` — record a busy deadline in emulated cycles instead of bracketing a host await
- [ ] **T45**: Modify `src/core/PIA6820.ts` — derive PB7 from the wired cycle provider
- [ ] **T46**: Modify `src/apple1/index.ts` — wire the engine's cycle count into the display path. Passes T43
- [ ] **T47**: Modify `src/apple1/__tests__/DisplayLogic.vitest.test.ts` — the case asserting PB7 is clear the moment a write returns becomes cycle-dependent
- [ ] **T48** [P]: Modify `src/apple1/KeyboardLogic.ts` — remove the three `console.log` calls
- [ ] **T49** [P]: Modify `src/apple1/constants/system.ts` — delete the unused 500 µs constant and correct the stale baud comment
- [ ] **T50** [P]: Modify `src/apple1/const.ts` — correct the same stale baud comment
- [ ] **T51** [P]: Modify `src/core/RAM.ts` — record the cleared-on-power-on deviation per D-012 in a comment
- [ ] **T52**: Modify `docs/active/hardware-accuracy-audit.md` — annotate each finding as closed, with the AC that covers it; keep the deviations recorded as intentional (power-on memory, control-line output path, backspace) marked as such

### Gate

- [ ] **T-audit**: Run `/lcd:audit hw-accuracy`; resulting `audit.md` has zero MISSING/BLOCKED rows
- [ ] **T-final**: Run `yarn test:ci` (lint + type-check + full suite) and `yarn wasm:check`, all green. Confirm T8, T11, T24 and T34 browser verifications were actually performed and their results recorded in the JOURNAL LOG — the suite cannot prove the Rust tiers

## Checkpoint validation

After every block of related tasks, the suite must stay green. Tier boundaries are the hard
checkpoints: Tier 1 must be green **and** browser-verified (T8) before Tier 2 begins, because the
PIA change moves the boot path and a later failure would be hard to attribute.

Watch specifically for: T21 breaking existing cycle-count assertions in the CPU suites; T41
breaking anything that reads unmapped space expecting zero; T45/T46 breaking the monitor's echo
loop if the cycle provider is not wired before the deadline logic goes live.

## Linkbacks

- `AC-1 (none)` → T1, T6
- `AC-2 (none)` → T2, T6
- `AC-3 (RENDER)` → T5, T6, T8
- `AC-4 (none)` → T3, T6
- `AC-5 (none)` → T4, T6
- `AC-6 (none)` → T9, T10, T11
- `AC-7 (none)` → T12, T15
- `AC-8 (none)` → T13, T15
- `AC-9 (none)` → T14, T16
- `AC-10 (none)` → T17, T18, T19, T20, T21
- `AC-11 (RENDER)` → T22, T23, T24
- `AC-12 (none)` → T25, T26, T27
- `AC-13 (none)` → T28, T29
- `AC-14 (none)` → T30, T31, T32, T33, T34
- `AC-15 (none)` → T35, T36, T37, T38, T39
- `AC-16 (none)` → T40, T41, T42
- `AC-17 (RENDER)` → T43, T44, T45, T46, T47

Tasks with no AC linkback are plan-mandated housekeeping rather than acceptance criteria: T7, T42
and T47 update tests whose premises the ACs invalidate; T48–T51 clear rule violations and dead
constants in files this work already touches; T52 keeps the audit document truthful as findings
close.

---

<!--
Quality checks before starting implementation:
  - Every AC × non-`none`-surface row in plan.md has at least one test task above
  - Every new file in plan.md "File structure" has at least one task that creates it
  - Tests appear before their implementation
  - T-audit appears before T-final (the audit gate must pass before suite-final)
  - T-final exists (run the suite, lint, type check)
-->
