# JOURNAL — wasm-cycle-double-count

> **The resume anchor.** The block between the `lcd-resume:v1` markers below is the *entire*
> cold-start payload — everything a fresh session needs to continue, in <~40 lines. `/lcd:resume`
> reads MAP.md + this block + DECISIONS headers and nothing else. Keep NOW and STEPS current as
> you work (the build loop and `lcd:refine` update them as part of their normal edit/commit
> step). Everything below the `---` is history/detail, NOT read on resume.

<!-- lcd-resume:v1 -->
## NOW
- **Lane:** Standard
- **Goal:** WASM engine reports the same per-instruction cycle count as the JS engine (issue #215): drop the `+= 1` in the two bus helpers so only the per-arm documented totals count.
- **Next action:** S2 — drop the helper increments in cpu.rs, rebuild WASM, parity → GREEN
- **Branch:** fix/wasm-cycle-double-count  ·  **Updated:** 2026-09-03 23:20

## STEPS
- [x] S1 — Test first: `compareEngines` in engine-parity also asserts the per-step returned cycles match; add a documented-cycle battery (NOP, LDA modes incl. `(zp),Y` page-cross, STA abs,X, JSR/RTS, branch taken/not/page-cross, INC abs). Run against real WASM via `yarn dev:vite` → RED (WASM ≈ 2×). Done: 23 failures, NOP=3 LDA#=4 LDAzp=6.
- [ ] S2 — Remove `self.cycles += 1` from `read_byte_from_bus` / `write_byte_to_bus` in `wasm-cpu/src/cpu.rs`; `cargo check`; `yarn wasm:build:release`; parity suite → GREEN.  ← next
- [ ] S3 — Update memory/docs that describe the double count (memory `wasm-cycle-double-count`, `docs/active/wasm-performance.md` if it mentions it); bump `src/version.ts` (fix/ → patch); `yarn test:ci`; PR closing #215.

## DECISIONS (this work-item)
- Model = "per-arm totals only" (issue option 2): smallest diff, matches the JS reference engine, and the JS engine's IRQ/NMI handlers also add a flat 7 with un-counted pushes — so after the fix the interrupt paths agree too.
- Cycle parity is asserted on the *returned* `performSingleStep()` value (the `ICPUEngine` contract) rather than on internal counters — it is what `Clock` budgets against.

## OPEN QUESTIONS
- none

## EDIT BOUNDARY (paths this work may touch)
- `wasm-cpu/src/cpu.rs`
- `src/core/cpu-engines/__tests__/engine-parity.vitest.test.ts`
- `src/version.ts`
- `docs/active/wasm-performance.md` (only if it describes the inflated count)
<!-- /lcd-resume -->

---

## LOG (append-only; not read on resume)

- 2026-09-03 23:20 — Triage → Standard (2 signals). Cause confirmed in `cpu.rs:476-490` (helpers add 1 per access) + every arm adds the full documented count. JS engine (`src/core/cpu6502/core.ts`) counts only per-arm totals; its bus read/write helpers do not touch `cycles`.
- 2026-09-03 23:40 — S1 done. Real-WASM run (yarn dev:vite on :3000): 23/27 parity tests RED on cycles only; state assertions still pass.
