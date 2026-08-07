# Plan: Core IC hardware accuracy

> **Deep lane · Phase 2 of 6 (Plan).** This document owns **how**. Specify ≠ Plan: if you're
> about to write a user story or acceptance criterion, that belongs in `spec.md`.

**Slug:** `hw-accuracy`
**Spec:** [`spec.md`](./spec.md) · **Journal:** [`JOURNAL.md`](./JOURNAL.md)
**Created:** 2026-08-06
**Status:** draft <!-- draft | approved | implemented | superseded -->

---

## Goal

Close the 15 deviations recorded in `docs/active/hardware-accuracy-audit.md` across both CPU
engines, the PIA, the bus and the terminal path, so that emulated behaviour matches the
manufacturer documentation and the two engines agree.

## Architecture

The work divides into five independent mechanical changes plus one genuinely structural one. It
is deliberately **not** a rewrite: every finding maps to a small, local edit in an existing
component, which is why the tier ordering in `tasks.md` can land them one at a time behind
separate commits.

**PIA register state (AC-1…AC-5).** `PIA6820` seeds `cra`/`crb`/`ddrb` in both its constructor and
`resetState()`. Both drop to zero. The interrupt-flag clear currently sits above the
DDR/output-register branch in `read()`; it moves _inside_ the output-register branch and clears
both `CR_IRQ1` and `CR_IRQ2`. This is the highest-risk tier despite being the smallest diff,
because it changes the boot path: with `crb = 0x00`, WOZMON's `STY $D012` starts landing in DDRB
and the spurious `ioB.write(0x7f)` disappears. Everything downstream of the display handshake sees
that change, so this tier lands first and alone.

**Decimal mode in the Rust core (AC-6).** `adc_bus`/`sbc_bus` gain a decimal branch mirroring the
NMOS semantics the TypeScript core already implements — BCD result and carry, N/Z/V from the
binary result. The TypeScript implementation is the specification here because it was verified
against the documented behaviour; the Rust side is a port, not a redesign.

**Addressing-mode read/write split (AC-10).** The opcode table composes an addressing mode with an
instruction (`m.abx(); m.sta();`), so the cycle rule lives in the addressing mode and is shared by
loads and stores alike. Rather than pass a flag or branch on the instruction, add three
fixed-cost siblings — `abxw`, `abyw`, `izyw` — and repoint every writing opcode at them. Roughly
25 table entries change; no existing behaviour moves. Rejected: threading a `isWrite` parameter
through the addressing modes (adds a branch to the hottest path in the interpreter for a
compile-time-known fact), and computing the penalty in the instruction (splits one rule across two
modules).

**Bus mirroring (AC-15, AC-16) — and the one thing this plan does _not_ need.** Triage flagged
`Bus.validate()`'s overlap rejection as a hard architecture trigger, on the assumption that
mirroring means overlapping ranges. It doesn't. The PIA mapping simply **widens** to
`$D000-$DFFF` and gains an offset mask, so the decoded offset becomes
`(address - base) & mirrorMask` instead of `address - base`. No range overlaps any other, so
`validate()` is untouched and every existing mapping keeps its exact-range semantics. The bus
contract grows one optional field. Rejected: relaxing `validate()` to permit overlaps with
precedence rules — strictly more machinery, and it would delete a guard that currently catches
real mapping mistakes.

**Display handshake pacing (AC-17).** Busy becomes _derived_ rather than _pushed_. `DisplayLogic`
records a deadline in emulated cycles when a character is written; the PIA asks a wired cycle
provider whether that deadline has passed when port B is read. Nothing is added to the step loop
and no timer is involved, so the handshake cannot drift with host speed. Rejected: a `tick()`
called from the clock subscriber (needs new wiring in the hot loop to express the same thing), and
keeping the host-`await` model with a longer delay (leaves the defect — duration still set by host
scheduling).

**Undocumented opcodes (AC-14).** Per D-013 this is parity by addition, not subtraction. The
TypeScript side is a correctness fix: the opcode table already calls `rmw()` after each of these,
but the instruction bodies leave `tmp` holding the accumulator result rather than the modified
memory value, and two of them operate on `A` instead of memory entirely. The Rust side is new
surface area — the largest single block of work in the item, and the one verifiable only in a
browser. It lands last for that reason.

## Constitution check

| Rule                                                       | Applies?     | Compliance note                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `testing.md` (tests first, coverage)                       | yes (always) | Every AC gets a failing test in phase 4 before any source edit; red-green loop drives them to green. Full `yarn test:ci` before the PR, since this is a multi-file change.                                                                                                                                                                                                                                             |
| `no-downgrade.md` (preserve features)                      | yes (always) | No capability is removed. The one downgrade on the table — deleting the undocumented opcodes from the TypeScript engine to reach parity by subtraction — was explicitly offered and explicitly rejected by the maintainer (D-013). Backspace support in the display is preserved (spec Out of scope).                                                                                                                  |
| `no-overengineering.md` (minimal scope)                    | yes (always) | Each finding gets the smallest edit that satisfies its AC. Concretely: `validate()` is left alone because a mask makes overlaps unnecessary; three addressing siblings instead of a parameterised addressing layer; power-on memory left as-is per D-012 rather than building a fill-strategy abstraction.                                                                                                             |
| `refinement-protocol.md` (ambiguous edits)                 | yes (always) | Four ambiguous scope points were restated as options and resolved with the maintainer before `spec.md` was written; the "what stays unchanged" half is the spec's Out of scope section.                                                                                                                                                                                                                                |
| `versioning.md` (bump in first commit)                     | yes (always) | Verified `git show $(git merge-base HEAD master):src/version.ts` → `4.51.8`; branch is `fix/` → patch; bumped to `4.51.9` in `f4a5169`, the branch's first commit. No further bump needed.                                                                                                                                                                                                                             |
| `commits.md` (atomic, conventional, push)                  | yes (always) | One commit per test flipping red→green. **Deviation, deliberate:** the bundled rule says push only on request; this project's maintainer has a standing global rule to always push after commit, and a project rule overrides the bundled one of the same name. Pushing after each commit.                                                                                                                             |
| `ac-convention.md` — EVAL coverage                         | no           | No `EVAL` AC. This project's conventions declare `eval: n/a` — a cycle-accurate emulator is deterministic with no scored, ranked or generated output. The datasheet is an exact oracle, so every AC is a deterministic equality check, not a quality threshold. There is no silently-wrong path in the LLM/scorer sense.                                                                                               |
| `MAP.md`: never commit to `master`                         | yes          | Working on `fix/hw-accuracy`, branched before the first commit.                                                                                                                                                                                                                                                                                                                                                        |
| `MAP.md`: dual-engine parity                               | yes          | The load-bearing invariant here, and the one this plan _changes the meaning of_ — see D-011. Parity is now verified against the datasheet rather than against whichever engine is treated as canonical. AC-6, AC-7, AC-8, AC-9, AC-10, AC-12 and AC-14 each assert both engines.                                                                                                                                       |
| `MAP.md`: WASM verified in a browser, not CI               | yes          | Rust-touching tiers (T2, and T6's opcode port) get `cargo check` plus a browser pass driven by in-page JS, per the project's own guidance that the page never reaches `document_idle`. The Node parity suites will continue to `skipIf`. This is a real limitation, not a gap being papered over: **the Rust changes cannot be gated by CI**, and `tasks.md` must carry an explicit manual verification task for them. |
| `MAP.md`: no `any`, no `console.log`                       | yes          | No `any` introduced. Three existing `console.log` calls in the keyboard path are removed as part of T6 — they violate the rule today and sit in a file this work touches anyway.                                                                                                                                                                                                                                       |
| `MAP.md`: stateful/inspectable contracts scoped to core/IO | yes          | All edits are inside the core/IO layer; no React component gains a contract. The PIA's `saveState`/`validateState` shape is unchanged — only register _initial values_ move, so no state-version bump is needed.                                                                                                                                                                                                       |
| `MAP.md`: WASM build stays speed-first                     | yes          | No build-profile change. The added Rust instructions grow the binary somewhat; `opt-level = 3` and the `-O3` wasm-opt pass are untouched, and the abandoned <100 KB size target is not being restored.                                                                                                                                                                                                                 |
| `MAP.md`: markdownlint per-file only                       | yes          | `npx markdownlint-cli2 --fix` on the specific files edited. Never the repo-wide `lint:md:fix`.                                                                                                                                                                                                                                                                                                                         |

## Cross-path behavior matrix

Three acceptance criteria carry a non-`none` surface; the rest are internal emulation behaviour.
`RENDER` cells are bare file paths per the path-cell convention.

| AC      | Surface | Path                         |
| ------- | ------- | ---------------------------- |
| `AC-3`  | RENDER  | `src/apple1/DisplayLogic.ts` |
| `AC-11` | RENDER  | `src/apple1/WebCRTVideo.ts`  |
| `AC-17` | RENDER  | `src/apple1/DisplayLogic.ts` |

## Reused primitives

| Existing primitive                                   | Path                                                               | Used for                                                                                                                                                |
| ---------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rmw()` addressing helper                            | `src/core/cpu6502/addressing.ts`                                   | Already writes `tmp` back after read-modify-write instructions — the undocumented-opcode fix corrects what `tmp` holds, rather than adding a write path |
| Opcode-table composition (`m.abx(); m.sta();`)       | `src/core/cpu6502/opcodes.ts`                                      | The read/write cycle split is expressed by swapping the addressing call in ~25 entries; no new dispatch mechanism                                       |
| `Bus.findInstanceWithAddress` + address cache        | `src/core/Bus.ts`                                                  | Mirroring rides the existing binary search and LRU cache; only the offset computation changes                                                           |
| `BusSpaceType` mapping record                        | `src/core/types/`                                                  | Gains one optional mask field rather than a new mapping concept                                                                                         |
| `VersionedStatefulComponentBase`                     | `src/core/base/`                                                   | PIA/RAM/ROM state contracts stay as they are — no migration needed, since only initial values change                                                    |
| `IoWriter` / `wire()` wiring convention              | `src/apple1/DisplayLogic.ts`, `KeyboardLogic.ts`                   | The cycle provider is injected through the existing `wire()` options object, not a new constructor dependency                                           |
| `getCompletedCycles()` / `EngineMetrics.totalCycles` | `src/core/cpu6502/core.ts`, `src/core/cpu-interface/ICPUEngine.ts` | Source of emulated time for the handshake deadline; already on the engine interface                                                                     |
| `adc`/`sbc` decimal implementation                   | `src/core/cpu6502/instructions.ts`                                 | The reference the Rust port is written against — it already encodes NMOS BCD semantics with binary-derived N/Z/V                                        |
| Vitest + existing `__tests__` co-location            | `src/**/__tests__/`                                                | Test placement per the project's discovery glob                                                                                                         |

## Data model / Contracts

One contract change: `BusSpaceType` gains an optional offset mask.

```ts
{
  addr: [0xd000, 0xdfff],   // widened from [0xd010, 0xd013]
  component: pia,
  name: 'PIA6820',
  mirrorMask: 0x03,          // NEW, optional — decoded offset = (address - addr[0]) & mirrorMask
}
```

Absent the field, decoding is unchanged (`address - addr[0]`), so every existing mapping and every
existing test keeps its current meaning. `validate()` is not modified.

The Rust bus needs the matching region widened (`$D010-$D013` → `$D000-$DFFF` marked `IO`); it
already forwards the full address to the TypeScript bus, so the mask is applied once, on the
TypeScript side, for both engines.

## File structure

> This section is the source of truth for the JOURNAL **EDIT BOUNDARY**. The red-green loop may
> only modify paths listed here; copy them into the work-item JOURNAL's EDIT BOUNDARY block.

### New files

```text
src/core/__tests__/PIA6820-hw-accuracy.vitest.test.ts     AC-1..AC-5: reset register state, IRQ flag clearing
src/core/__tests__/CPU6502-hw-accuracy.vitest.test.ts     AC-6..AC-10, AC-12..AC-14: instruction + reset behaviour
src/core/__tests__/Bus-hw-accuracy.vitest.test.ts         AC-15, AC-16: PIA mirroring, unmapped read value
src/apple1/__tests__/DisplayLogic-hw-accuracy.vitest.test.ts   AC-3, AC-17: no reset artefact, cycle-paced busy
src/apple1/__tests__/WebCRTVideo-hw-accuracy.vitest.test.ts    AC-11: 64-glyph uppercase folding
```

### Modified files

- `src/core/PIA6820.ts` — zero the register seeds in constructor and `resetState()`; move the IRQ
  clear inside the data-register branch and clear both flags; consult the cycle provider for PB7
- `src/core/cpu6502/addressing.ts` — add `abxw`/`abyw`/`izyw` fixed-cost siblings; wrap the `(zp,X)`
  pointer high byte in zero page; move the `JMP (ind)` page bug onto the pointer dereference
- `src/core/cpu6502/instructions.ts` — stop clearing D in `brk`; correct the write-back value in
  `slo`/`rla`/`sre`/`rra`/`dcp`/`isc`; correct `anc`
- `src/core/cpu6502/opcodes.ts` — repoint ~25 writing opcodes at the fixed-cost addressing siblings
- `src/core/cpu6502/core.ts` — reset leaves A/X/Y and D alone and decrements S by three; invert the
  NMI latch edge
- `src/core/cpu6502/types.ts` — declare the new addressing siblings on the CPU interface
- `src/core/Bus.ts` — apply `mirrorMask` when computing the decoded offset; unmapped read returns
  the floating-bus value
- `src/core/types/` (bus space type) — add the optional `mirrorMask` field
- `src/core/RAM.ts` — comment only: record the cleared-on-power-on deviation per D-012
- `src/apple1/index.ts` — widen the PIA mapping to `$D000-$DFFF` with the mask; wire the cycle
  provider into `DisplayLogic`
- `src/apple1/DisplayLogic.ts` — set a busy deadline in emulated cycles instead of bracketing a host `await`
- `src/apple1/WebCRTVideo.ts` — fold incoming characters into the 64-glyph uppercase repertoire
- `src/apple1/KeyboardLogic.ts` — remove the three `console.log` calls
- `src/apple1/constants/system.ts` — delete the unused 500 µs constant; correct the stale baud comment
- `src/apple1/const.ts` — correct the same stale baud comment
- `wasm-cpu/src/instructions_with_bus.rs` — decimal branch in `adc_bus`/`sbc_bus`
- `wasm-cpu/src/instructions_bus_impl.rs` — undocumented instruction implementations
- `wasm-cpu/src/opcodes_with_bus.rs` — dispatch arms for the undocumented opcodes
- `wasm-cpu/src/cpu.rs` — reset register/stack semantics
- `wasm-cpu/src/bus.rs` — widen the IO region to `$D000-$DFFF`
- `src/core/__tests__/Bus.vitest.test.ts` — update the unmapped-read expectation (currently asserts `0`)
- `src/core/__tests__/PIA6820.vitest.test.ts` — one case asserts the control registers are
  "already initialized to 0x04"; that premise goes away with AC-1
- `src/apple1/__tests__/DisplayLogic.vitest.test.ts` — asserts PB7 reads clear immediately after a
  write; becomes cycle-dependent under AC-17
- `docs/active/hardware-accuracy-audit.md` — annotate findings as they close
- `docs/lcd/work/hw-accuracy/JOURNAL.md` — kept current as work proceeds

## Risks & rejected alternatives

- **Two existing tests encode the behaviour being corrected.** Verified by inspection rather than
  assumed: `PIA6820.vitest.test.ts` has one case resting on the pre-seeded control registers, and
  `DisplayLogic.vitest.test.ts` asserts PB7 is clear the moment a write returns. Both are listed
  above. The remaining PIA-touching suites (`WorkerAPI-power-on-noise-screen`,
  `WorkerAPI-wasm-js-parity`, `KeyboardLogic`, and the three integration suites) were checked and
  set the control registers explicitly or use a fake, so they are unaffected.
- **The PIA reset change moves the boot path.** With `crb = 0x00` the monitor's `STY $D012` reaches
  DDRB and the spurious `$7F` display write stops happening. Anything that has quietly come to
  depend on the current behaviour — the display handshake, save-state fixtures, existing PIA tests
  — may shift. Mitigation: T1 lands alone, ahead of everything else, and gets a browser boot check
  before the next tier starts.
- **Changing the unmapped read value is observable.** `src/core/__tests__/Bus.vitest.test.ts:49`
  asserts `0` today; the Rust bus already returns `0xFF`. Settling on the floating-high convention
  makes the engines agree but changes a documented return value. Called out rather than slipped in.
- **The Rust opcode port cannot be gated by CI.** Roughly eighteen instructions plus decimal
  variants, verifiable only by driving a browser. This is the largest correctness risk in the item
  and the strongest argument for landing it last, behind everything CI _can_ prove.
- **Relaxing `Bus.validate()` to allow overlaps**: rejected — a mask achieves mirroring without
  overlaps, and the overlap guard catches real mapping mistakes today.
- **Threading an `isWrite` flag through the addressing modes**: rejected — puts a runtime branch in
  the interpreter's hottest path for something known at table-construction time.
- **Parity by subtraction (removing undocumented opcodes from the TypeScript engine)**: rejected by
  the maintainer as a feature downgrade; see D-013.
- **Modelling the adapter's CA2/CB2 output path**: rejected for this item — pacing from emulated
  time fixes the observable defect (host-dependent timing); the control-line mechanism stays
  unmodelled and recorded in the audit.

---

<!--
Quality checks before approving this plan:
  - Every spec acceptance criterion maps to something in this plan
  - Constitution check has at least one filled-in row beyond the always-on bundled rules
  - If behavior is multi-surface → matrix has one row per (AC × non-`none` surface) pair
  - Every AC ID referenced in the matrix matches the spec.md
  - Reused primitives section is non-empty
  - File structure is concrete enough to translate directly into tasks.md AND the JOURNAL EDIT BOUNDARY
-->
