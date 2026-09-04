# JOURNAL — hw-accuracy

> **The resume anchor.** The block between the `lcd-resume:v1` markers below is the _entire_
> cold-start payload — everything a fresh session needs to continue, in <~40 lines. `/lcd:resume`
> reads MAP.md + this block + DECISIONS headers and nothing else. Keep NOW and STEPS current as
> you work (the build loop and `lcd:refine` update them as part of their normal edit/commit
> step). Everything below the `---` is history/detail, NOT read on resume.

<!-- lcd-resume:v1 -->

## NOW

- **Lane:** Deep
- **Goal:** Bring the emulated core ICs into agreement with the original hardware, closing the 15
  deviations recorded in `docs/active/hardware-accuracy-audit.md`.
- **Next action:** none — maintainer confirmed keyboard and reset work; PR #213 ready for merge
- **Branch:** fix/hw-accuracy · **Updated:** 2026-08-06 23:40

## STEPS

> Tier-level view of `tasks.md` (54 tasks). Task IDs in brackets.

- [x] S1 — triage → Deep; audit doc + triage log committed as first commit on branch
- [x] S2 — spec.md written; 4 scope questions resolved with the user
- [x] S3 — plan.md written; bus mirroring found not to need `validate()` relaxed
- [x] S4 — tasks.md written; 54 tasks, 7 parallel-eligible
- [x] S5 — 17 failing tests generated, one per (AC × surface); 16 red, AC-6 green on arrival
- [x] S6 — Tier 1 PIA power-on + IRQ flags [T1–T7] green in 2 iterations, 0 reverts
- [x] S6b — Tier 1 browser boot check [T8] — gates Tier 2 ← next
- [x] S7 — Tier 2 Rust decimal mode [T9–T10] + browser verify [T11]
- [x] S8 — Tier 3 TypeScript CPU correctness: (zp,X), JMP (ind), BRK/D [T12–T16]
- [x] S9 — Tier 4 store/RMW fixed cycle counts [T17–T21]
- [x] S10 — Tier 5 terminal 64-glyph folding [T22–T23] + browser verify [T24]
- [x] S11 — Tier 6 tail: reset, NMI, undocumented opcodes, bus mirroring, unmapped read,
      handshake pacing, cosmetics [T25–T52] + browser verify [T34]
- [x] S12 — audit gate [T-audit], full suite [T-final], then PR

## DECISIONS (this work-item)

- Power-on memory stays uniformly cleared (D-012) — determinism beats fidelity for a finding no
  real software observes.
- Undocumented opcodes are corrected in the TypeScript engine AND ported to Rust (D-013), so the
  parity invariant holds literally.
- The reference oracle is per-behaviour, not per-engine (D-011): the datasheet decides which
  engine moves.
- Partial decoding is modelled for the PIA mirror only; memory-region mirroring needs the schematic.
- The display handshake is paced from emulated cycles; the CA2/CB2 output path stays unmodelled.
- Bus mirroring uses an offset **mask on a widened range**, not overlapping ranges — so
  `Bus.validate()` is untouched and no existing mapping changes meaning.
- Store/RMW indexed timing is fixed by three new fixed-cost addressing siblings, not by a runtime
  `isWrite` branch in the interpreter's hot path.

## OPEN QUESTIONS

- none blocking. Processor clock frequency (1.0 vs 1.023 MHz) is unresolved but out of scope —
  needs the machine's schematic.

## EDIT BOUNDARY (paths this work may touch)

- `src/core/PIA6820.ts`
- `src/core/Bus.ts`
- `src/core/RAM.ts`
- `src/core/types/bus.ts`
- `src/core/types/index.ts`
- `src/core/cpu6502/addressing.ts`
- `src/core/cpu6502/instructions.ts`
- `src/core/cpu6502/opcodes.ts`
- `src/core/cpu6502/core.ts`
- `src/core/cpu6502/types.ts`
- `src/core/__tests__/PIA6820-hw-accuracy.vitest.test.ts`
- `src/core/__tests__/CPU6502-hw-accuracy.vitest.test.ts`
- `src/core/__tests__/Bus-hw-accuracy.vitest.test.ts`
- `src/core/__tests__/PIA6820.vitest.test.ts`
- `src/core/__tests__/Bus.vitest.test.ts`
- `src/core/__tests__/CPU6502-JumpCall.vitest.test.ts`
- `src/core/cpu-engines/__tests__/wasm-memory-bridge-reentrancy.vitest.test.ts`
- `src/apple1/index.ts`
- `src/apple1/DisplayLogic.ts`
- `src/apple1/WebCRTVideo.ts`
- `src/apple1/KeyboardLogic.ts`
- `src/apple1/const.ts`
- `src/apple1/constants/system.ts`
- `src/apple1/__tests__/DisplayLogic-hw-accuracy.vitest.test.ts`
- `src/apple1/__tests__/WebCRTVideo-hw-accuracy.vitest.test.ts`
- `src/apple1/__tests__/DisplayLogic.vitest.test.ts`
- `src/apple1/__tests__/Apple1-boot-hw-accuracy.vitest.test.ts`
- `wasm-cpu/src/instructions_with_bus.rs`
- `wasm-cpu/src/instructions_bus_impl.rs`
- `wasm-cpu/src/opcodes_with_bus.rs`
- `wasm-cpu/src/cpu.rs`
- `wasm-cpu/src/bus.rs`
- `src/version.ts`
- `docs/active/hardware-accuracy-audit.md`
- `docs/lcd/work/hw-accuracy/`

<!-- /lcd-resume -->

---

## Acceptance criteria

See `spec.md` — AC-1 through AC-17. Surfaces in use: `RENDER` (display path) and `none`
(internal emulation). No `EVAL` AC: this project's conventions declare eval `n/a` because a
cycle-accurate emulator is deterministic with no scored or generated output — the datasheet is an
exact oracle, not a quality threshold. `plan.md`'s Constitution check states this.

## LOG (append-only; not read on resume)

- 2026-08-06 21:50 — Hardware-accuracy audit completed against manufacturer documentation and
  the Apple 1 hardware description. 15 findings. CPU and PIA claims measured with a throwaway
  probe harness (preserved outside the repo); WASM entries code-read, since that engine cannot
  run outside a browser.
- 2026-08-06 22:10 — Triaged Deep (5 signals, hard trigger: cross-cutting architecture —
  addressing-mode read/write split plus the bus decoding model; risk signal: multi-session).
  Logged to `docs/lcd/triage-log.md`.
- 2026-08-06 22:15 — Branch `fix/hw-accuracy` created, version bumped 4.51.8 → 4.51.9, audit doc
  and triage log committed as `f4a5169`, pushed.
- 2026-08-06 22:24 — spec.md written. Four scope questions resolved with the user: power-on memory
  stays cleared; undocumented opcodes get corrected AND ported to Rust (the heavier option, chosen
  to honour parity literally); partial decoding limited to the adapter mirror; display handshake
  paced from emulated time rather than modelling the control-line path. `lcd:recon` deliberately
  skipped — it exists to catch drift in current library/API practice, and datasheet behaviour does
  not drift; sourcing is already cited in the audit. Committed `8589ff7`, pushed.
- 2026-08-06 22:29 — plan.md written. Two findings worth carrying forward: (1) triage's stated hard
  trigger was partly wrong — PIA mirroring needs an offset mask on a widened range, **not**
  overlapping ranges, so `Bus.validate()` is untouched and the bus contract grows one optional
  field; (2) the opcode table's `m.abx(); m.sta();` composition means the store/RMW cycle fix is
  three new addressing siblings plus ~25 table entries, with no dispatch change. Constitution check
  run against the bundled rules read in full; the `commits.md` push clause is deliberately overridden
  by the maintainer's standing global rule. Confirmed the version bump against
  `git merge-base HEAD master` rather than assuming it. Recorded the real limitation: the Rust tiers
  cannot be gated by CI, so tasks.md must carry an explicit manual browser-verification task.
- 2026-08-06 22:34 — tasks.md written: 54 tasks in 6 tiers, 7 parallel-eligible. Coverage verified — every
  AC has a task, every new file in the plan has a creating task, every modified file a modifying
  task. Editing the plan first (rather than inventing tasks) added two files it had missed:
  `PIA6820.vitest.test.ts` has a case resting on the pre-seeded control registers, and
  `DisplayLogic.vitest.test.ts` asserts PB7 is clear the instant a write returns — both premises
  the ACs invalidate. Checked the other six PIA-touching suites: unaffected, they set the control
  registers explicitly or use a fake. Browser-verification tasks (T8, T11, T24, T34) are written as
  first-class tasks, not notes, because `yarn test:ci` cannot reach the Rust core.
- 2026-08-06 22:39 — `lcd:refine`: EDIT BOUNDARY rewritten as one concrete path per line. It had been
  written as prose ("`src/core/__tests__/` — new `PIA6820-hw-accuracy`, ..."), which reads fine to a
  human but gave the boundary hook nothing to match, so it denied the first test-gen write.
  Mechanical drift, no change of intent or scope. Also added the three existing test files the
  tasks phase identified (`PIA6820.vitest.test.ts`, `Bus.vitest.test.ts`,
  `DisplayLogic.vitest.test.ts`), which the prose form had described but not named. 1 intervention.
- 2026-08-06 22:42 — test-gen: 17 tests emitted across 5 files, one per (AC × surface). Scoped run is red as
  required — **16 failing, 1 passing**. The pass is AC-6 (decimal mode) and it is expected, not a
  defect in the test: the TypeScript engine already implements NMOS decimal correctly, and the
  half of that AC which is actually broken lives in the Rust core, which Node cannot reach. AC-6's
  real gate is the browser task T11. Recorded rather than papered over — a green test here must not
  be read as decimal mode being verified.
  Also refined `tasks.md`: it had written `none`-surface test names as `AC-N (none):`, but the phase
  contract drops the suffix for `none`. Emitted literals verified by grep: all 17 present, correct form.
- 2026-08-06 22:48 — red-green Tier 1: **green in 2 iterations, 0 reverts**. Iteration 1 zeroed the register
  seeds (flipped AC-1, AC-2, and AC-3 — the display artefact disappeared as soon as the routing was
  right); iteration 2 moved the interrupt-flag clear inside the data-register branch and widened it
  to both flags (AC-4, AC-5). Committed `0dacf22`.
  Regression check ran the FULL suite, not just the scoped tests: exactly one existing case broke —
  `PIA6820.vitest.test.ts > read method works correctly`, the one the plan predicted. Fixed per the
  refinement protocol: its intent is untouched, only its setup premise, which now programs the port
  configuration the way WOZMON does. All 17 cases in that file green again.
  Suite now 11 failures, all later-tier ACs. `yarn type-check` reports 2 errors — `wireCycleProvider`
  and `mirrorMask` — which are the deliberately-unwritten APIs the AC-17 and AC-15 tests call; they
  resolve at T45 and T36. `yarn test:ci` will therefore stay red until Tier 6, as expected mid-flight.
- 2026-08-06 22:51 — `lcd:refine`: added `src/apple1/__tests__/Apple1-boot-hw-accuracy.vitest.test.ts` to the
  EDIT BOUNDARY. Rationale: T8 is a browser check gating Tier 2, and the plan's own risk section says
  the PIA change moves the boot path. A system-level boot test assembles the real machine and runs
  WOZMON headlessly on the TypeScript engine, which converts most of that gate into something CI can
  prove and keeps guarding it forever. The browser half of T8 still stands for the WASM engine and
  real rendering. Scope addition, logged rather than silent.
- 2026-08-06 23:00 — `lcd:refine`: added `src/core/__tests__/CPU6502-JumpCall.vitest.test.ts` to the EDIT
  BOUNDARY. AC-12 changed reset to decrement the stack pointer by three instead of forcing it to
  $FF, and that test hardcoded the absolute stack addresses $1FF/$1FE rather than deriving them from
  the stack pointer it had already captured. Its intent (JSR pushes PC-1 high-then-low, S drops by
  two) is unchanged. The plan predicted PIA and DisplayLogic fallout but not this one — a reminder
  that a reset-semantics change reaches further than the component it lives in.
- 2026-08-06 23:18 — Tiers 2-6 complete; audit PASS. All 17 ACs green, `yarn test:ci` 784 passing,
  `yarn wasm:check` clean, WASM release builds at 129 KB.
  Browser verification of what CI cannot reach: decimal mode and the full undocumented instruction
  set driven against the real `WasmSystem` — every value matched the TypeScript expectation exactly.
  Boot confirmed on the WASM engine (cycles advancing ~1MHz, no console errors). Character-set fold
  confirmed by importing the shipped module in the browser.
  **Honest gap:** four attempts to inject synthetic KeyboardEvents into the hidden focus input never
  reached the emulator, so the end-to-end keyboard→display path was not exercised. Verified the fold
  via the shipped module instead — same code, one integration hop short. Recorded in `audit.md`
  rather than quietly counted as done.
  Two unplanned regressions, both predicted in class if not in name: a JSR test hardcoding stack
  addresses, and the two display/bus tests the plan did name. 2 boundary refines, 1 hook denial.
- 2026-08-06 23:40 — **AC-17 withdrawn after two regressions it caused, both maintainer-reported.**
  (1) The cycle provider queried the engine from inside a bus callback. On WASM a bus access is a
  callback out of running WASM, so that re-entered wasm-bindgen and threw "recursive use of an
  object" on every PIA access — display and keyboard dead. Fixed by snapshotting between chunks,
  and guarded by a new Node test against the real bridge.
  (2) Even fixed, the deadline is absolute and `reset()` zeroes the cycle counter on both engines,
  so a deadline set before a reset sat unreachable and stranded the monitor after the `\` prompt
  with the cursor at row 0 col 1 — the longer the session, the longer the stall. Underneath that,
  the clock only exposes emulated cycles at chunk boundaries, so the display quantises to the chunk
  rate and echo stutters regardless.
  Reverted to the host-paced handshake, which worked. Finding 13 is now an accepted deviation with
  the reason recorded in the audit so nobody repeats this. A real fix needs the clock to expose
  emulated time continuously — an execution-architecture change, not a work-item.
  Lesson recorded: during the original verification, keystrokes not reaching the emulator was
  written off as browser-tooling noise. It was the bug. A failed verification is a signal.
- 2026-08-06 — Maintainer confirmed keyboard input and reset behave correctly. Review feedback
  addressed (15 comments): ARR never rotated on either engine, a latched NMI survived reset in Rust,
  undocumented NOP cycle counts were flat, and indexed LAX/LAS skipped the page-cross cycle. Two of
  my own tests were vacuous — the ANC assertion passed against the exact bug it was written for, and
  the NMI test passed with the edge check removed. KIL deferred with a recorded reason.
  D-015 added: nothing on the bus path may call into the WASM engine.

## DEEP PIPELINE (Deep lane only)

> Phase tracker for the Deep-lane pipeline. Files live beside this JOURNAL.

`spec.md ✅  plan.md ✅  tasks.md ✅  tests ✅  red-green ✅  audit.md ✅`

<!-- mark ✅ done · ⏳ in progress · ⬜ not started -->

<!--
Resume contract (why the block above is fenced):
  /lcd:resume extracts ONLY the lcd-resume:v1 block. If NOW/STEPS are stale, resume
  rebuilds a false context — so update them in the same edit where you change the work.
  /lcd:resume also cross-checks `Updated` + `Branch` against `git log` and warns if this
  JOURNAL is older than HEAD before trusting it.
-->
