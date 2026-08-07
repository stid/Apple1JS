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
- **Next action:** run `/lcd:tasks hw-accuracy`
- **Branch:** fix/hw-accuracy · **Updated:** 2026-08-06 22:29

## STEPS

- [x] S1 — triage → Deep; audit doc + triage log committed as first commit on branch
- [x] S2 — spec.md written; 4 scope questions resolved with the user
- [x] S3 — plan.md written; bus mirroring found not to need `validate()` relaxed
- [ ] S4 — tasks.md, tiered T1..T6 ← next
- [ ] S5 — failing tests, one per (AC × surface)
- [ ] S6 — red-green loop to green, commit per task
- [ ] S7 — browser verification of the Rust engine + RENDER surfaces
- [ ] S8 — audit gate, then PR

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

- `src/core/PIA6820.ts`, `src/core/Bus.ts`, `src/core/RAM.ts`, `src/core/types/` (bus space type)
- `src/core/cpu6502/` — `addressing.ts`, `instructions.ts`, `opcodes.ts`, `core.ts`, `types.ts`
- `src/apple1/` — `index.ts`, `DisplayLogic.ts`, `WebCRTVideo.ts`, `KeyboardLogic.ts`,
  `const.ts`, `constants/system.ts`
- `wasm-cpu/src/` — `instructions_with_bus.rs`, `instructions_bus_impl.rs`,
  `opcodes_with_bus.rs`, `cpu.rs`, `bus.rs`
- `src/core/__tests__/` — new `PIA6820-hw-accuracy`, `CPU6502-hw-accuracy`, `Bus-hw-accuracy`;
  modified `Bus.vitest.test.ts` (unmapped-read expectation)
- `src/apple1/__tests__/` — new `DisplayLogic-hw-accuracy`, `WebCRTVideo-hw-accuracy`
- `src/version.ts` (already bumped 4.51.8 → 4.51.9 in the branch's first commit)
- `docs/active/hardware-accuracy-audit.md`, `docs/lcd/work/hw-accuracy/`

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

## DEEP PIPELINE (Deep lane only)

> Phase tracker for the Deep-lane pipeline. Files live beside this JOURNAL.

`spec.md ✅  plan.md ✅  tasks.md ⬜  tests ⬜  red-green ⬜  audit.md ⬜`

<!-- mark ✅ done · ⏳ in progress · ⬜ not started -->

<!--
Resume contract (why the block above is fenced):
  /lcd:resume extracts ONLY the lcd-resume:v1 block. If NOW/STEPS are stale, resume
  rebuilds a false context — so update them in the same edit where you change the work.
  /lcd:resume also cross-checks `Updated` + `Branch` against `git log` and warns if this
  JOURNAL is older than HEAD before trusting it.
-->
