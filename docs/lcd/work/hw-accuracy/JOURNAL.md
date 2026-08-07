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
- **Next action:** run `/lcd:plan hw-accuracy`
- **Branch:** fix/hw-accuracy · **Updated:** 2026-08-06 22:24

## STEPS

- [x] S1 — triage → Deep; audit doc + triage log committed as first commit on branch
- [x] S2 — spec.md written; 4 scope questions resolved with the user
- [ ] S3 — plan.md (architecture, Constitution check, cross-path matrix) ← next
- [ ] S4 — tasks.md, tiered T1..T6
- [ ] S5 — failing tests, one per (AC × surface)
- [ ] S6 — red-green loop to green, commit per task
- [ ] S7 — browser verification of the WASM engine + RENDER surfaces
- [ ] S8 — audit gate, then PR

## DECISIONS (this work-item)

- Power-on memory stays uniformly cleared — determinism beats fidelity for a finding no real
  software observes. Recorded as an intentional deviation, not fixed.
- Undocumented opcodes are corrected in the reference engine AND ported to the second engine, so
  the parity invariant holds literally rather than being scoped to documented instructions.
- Partial address decoding is modelled for the peripheral adapter's mirror only; memory-region
  mirroring is left alone because the schematic is not in hand.
- The display handshake is paced from emulated time; the adapter's control-line output mechanism
  stays unmodelled.
- The reference-oracle assumption is inverted for four findings: the second engine is the more
  accurate one, so those fixes port that way.

## OPEN QUESTIONS

- none blocking. Processor clock frequency (1.0 vs 1.023 MHz) is unresolved but out of scope —
  needs the machine's schematic.

## EDIT BOUNDARY (paths this work may touch)

- `src/core/PIA6820.ts`
- `src/core/cpu6502/` (addressing, instructions, opcodes, core)
- `src/core/Bus.ts`
- `src/core/RAM.ts` (comment/doc only — fill behaviour is out of scope)
- `src/apple1/DisplayLogic.ts`, `src/apple1/WebCRTVideo.ts`, `src/apple1/KeyboardLogic.ts`
- `src/apple1/constants/system.ts`, `src/apple1/const.ts`
- `wasm-cpu/src/` (cpu, instructions, opcodes, bus)
- `src/**/__tests__/` (new tests per AC)
- `src/version.ts`
- `docs/active/hardware-accuracy-audit.md` (status annotations as findings close)

<!-- /lcd-resume -->

---

## Acceptance criteria

See `spec.md` — AC-1 through AC-17. Surfaces in use: `RENDER` (display path) and `none`
(internal emulation). No `EVAL` AC: this project's conventions declare eval `n/a` because a
cycle-accurate emulator is deterministic with no scored or generated output — the datasheet is an
exact oracle, not a quality threshold. `plan.md` restates this in its Constitution check.

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
  stays cleared; undocumented opcodes get corrected AND ported to the second engine (the heavier
  option, chosen to honour parity literally); partial decoding limited to the adapter mirror;
  display handshake paced from emulated time rather than modelling the control-line path.
  `lcd:recon` deliberately skipped — it exists to catch drift in current library/API practice, and
  datasheet behaviour does not drift; sourcing is already cited in the audit.

## DEEP PIPELINE (Deep lane only)

> Phase tracker for the Deep-lane pipeline. Files live beside this JOURNAL.

`spec.md ✅  plan.md ⬜  tasks.md ⬜  tests ⬜  red-green ⬜  audit.md ⬜`

<!-- mark ✅ done · ⏳ in progress · ⬜ not started -->

<!--
Resume contract (why the block above is fenced):
  /lcd:resume extracts ONLY the lcd-resume:v1 block. If NOW/STEPS are stale, resume
  rebuilds a false context — so update them in the same edit where you change the work.
  /lcd:resume also cross-checks `Updated` + `Branch` against `git log` and warns if this
  JOURNAL is older than HEAD before trusting it.
-->
