# Audit: hw-accuracy

**Re-run after AC-17 withdrawal.** **Run:** 2026-08-06 23:18 · **Branch:** `fix/hw-accuracy` · **Result: PASS** (0 MISSING, 0 BLOCKED)

Every (AC × surface) pair from `spec.md` has a passing test carrying its literal token, and every
non-`none` surface in `plan.md`'s cross-path matrix resolves to an existing handler.

## Coverage

| AC | Surface | Test literal | Handler | Result |
| --- | --- | --- | --- | --- |
| AC-1 | none | `AC-1:` | `src/core/PIA6820.ts` | PASS |
| AC-2 | none | `AC-2:` | `src/core/PIA6820.ts` | PASS |
| AC-3 | RENDER | `AC-3 (RENDER):` | `src/apple1/DisplayLogic.ts` | PASS |
| AC-4 | none | `AC-4:` | `src/core/PIA6820.ts` | PASS |
| AC-5 | none | `AC-5:` | `src/core/PIA6820.ts` | PASS |
| AC-6 | none | `AC-6:` | `wasm-cpu/src/instructions_with_bus.rs` | PASS (browser-verified) |
| AC-7 | none | `AC-7:` | `src/core/cpu6502/addressing.ts` | PASS |
| AC-8 | none | `AC-8:` | `src/core/cpu6502/addressing.ts` | PASS |
| AC-9 | none | `AC-9:` | `src/core/cpu6502/instructions.ts` | PASS |
| AC-10 | none | `AC-10:` | `src/core/cpu6502/addressing.ts` + opcode table | PASS |
| AC-11 | RENDER | `AC-11 (RENDER):` | `src/apple1/WebCRTVideo.ts` | PASS |
| AC-12 | none | `AC-12:` | `src/core/cpu6502/core.ts`, `wasm-cpu/src/cpu.rs` | PASS |
| AC-13 | none | `AC-13:` | `src/core/cpu6502/core.ts` | PASS |
| AC-14 | none | `AC-14:` | `src/core/cpu6502/instructions.ts` + Rust set | PASS (browser-verified) |
| AC-15 | none | `AC-15:` | `src/core/Bus.ts`, `src/apple1/index.ts` | PASS |
| AC-16 | none | `AC-16:` | `src/core/Bus.ts` | PASS |
| AC-17 | — | withdrawn | — | WITHDRAWN — see spec.md |

## Browser verification (what CI structurally cannot prove)

`yarn test:ci` cannot reach the Rust core, so these were run against the real WASM engine by
driving `WasmSystem` in a browser at `localhost:3000`. Every value matched the TypeScript
expectation exactly.

- **T11 · decimal mode** — `ADC #$01` with A=$09 → $10 (C=0); A=$99 → $00 (C=1);
  `SBC #$01` with A=$10, C=1 → $09.
- **T34 · undocumented set** — SLO → mem $80 / A $81; RLA → mem $80 / A $00;
  SRE → mem $01 / A $0E; RRA → mem $01 / A $11; DCP → mem $04 / A $05 / C=1;
  ISC → mem $06 / A $0A; ANC → A $0F / C=0; LAX → A=X=$42.
- **T8 · boot** — app running on the WASM engine, cycles advancing ~1MHz over a 2.5s sample
  (191.6M → 194.1M), no console errors on load or during run. Also covered by an automated
  system-level boot test on the TypeScript engine.
- **T24 · character set** — the shipped `WebCRTVideo` module in a browser rendered
  `a z A {` as `AZA[`, and every glyph on screen stayed within $20-$5F.

**Not verified via the UI keyboard path.** Four attempts to inject synthetic `KeyboardEvent`s
into the hidden focus input did not reach the emulator. The character-set fold was verified by
importing the shipped module in the browser instead, which covers the same code. The end-to-end
keyboard→display path remains unverified by this run and would need a real key press.

## Gate

- `yarn test:ci` — lint + type-check + 784 passing, 0 failing, 20 skipped
- `yarn wasm:check` — clean
- `yarn wasm:build:release` — succeeds; 129 KB, speed-first profile unchanged
