# JOURNAL — review-2026-11

> **The resume anchor.** The block between the `lcd-resume:v1` markers below is the _entire_
> cold-start payload. `/lcd:resume` reads MAP.md + this block + DECISIONS headers and nothing
> else. Everything below the `---` is history/detail, NOT read on resume.

<!-- lcd-resume:v1 -->

## NOW

- **Lane:** Standard
- **Goal:** Address every finding of the 2026-11-21 project health review as six stacked PRs
  (each branch is cut from the previous one; each bumps `src/version.ts`).
- **Next action:** S6 — `refactor/dead-code` (cut from `refactor/inspector-and-polling`)
- **Branch:** refactor/inspector-and-polling · **Updated:** 2026-11-21

## STEPS

- [x] S1 `chore/review-cleanup` — no behaviour change: untrack `wasm-cpu/src/wasm/`, drop unused
      packages and dead scripts, stale `.gitignore` entries, stale docs (Jest, 14×, WASM size).
- [x] S2 `fix/real-checks` — coverage provider + valid thresholds, husky 9 wiring for commitlint,
      `no-console` lint rule (+ route existing calls through LoggingService), keep
      `console.error`/`warn` in prod bundles, CI: release WASM, `yarn build`, `cargo test`, clippy,
      frozen lockfile, single run per PR.
- [x] S3 `fix/wasm-adc-decimal-overflow` — native stubs for the wasm-bindgen imports so CPU code
      runs under `cargo test`; failing ADC decimal V test; fix; parity suite vs real WASM.
- [x] S4 `fix/debugger-correctness` — tests first, on a real `Apple1` + `WorkerAPI`: resume on a
      breakpoint, double clock loop on load, clock tick exception, run-to-cursor transient
      breakpoint, WASM double I/O write, migrate-before-validate, awaited loadState, inspector
      placeholder values, disassembler key guard.
- [x] S5 `refactor/inspector-and-polling` — remove the main-thread `Apple1`; inspector tree from
      the worker; gate debug polling; memoize contexts; one engine-status source.
- [ ] S6 `refactor/dead-code` — UI, core and Rust dead code; unused Cargo deps.
- [ ] S7 — GitHub housekeeping: superseded Dependabot PRs, merged remote branches.

## DECISIONS (this work-item)

- Stacked branches rather than six branches off master: every PR bumps `src/version.ts`, so
  parallel branches would conflict on each merge.
- `.claude/pre-commit-check.sh` and `.claude/git-workflow.md` stay: both are documented in
  `.claude/README.md` (the review called them leftovers; that was wrong).
- `@testing-library/dom` stays: it is a peer dependency of `@testing-library/react`.

- CI keeps `on: [push, pull_request]`: the `tests` commit status is posted with `github.sha`,
  which on a `pull_request` event is the merge commit, so the push run is what marks the PR head.
  The review's "runs twice" point is withdrawn.
- `cargo test` joins CI in S3 (it fails until the native stubs land); clippy `-D warnings` in S6
  (18 warnings today, most of them in code S6 deletes).
- Coverage thresholds are floors just under measured values (all 64.7% lines, core 68%), not the
  old aspirational 90% that never ran.

- Debugger reads go through `Bus.peek` (new, optional `IoAddressable.peek`); only the PIA
  implements it. CPU reads still use `read`.
- JS `performBulkSteps` budget check is `<` like Rust (was `<=`: one extra instruction per
  batch, and one instruction executed before reset at construction).

- Not done, on measurement: a direct lookup table in `Bus` gives the JS engine +10% (67 → 74 MHz
  headless) and would remove the cache stats the inspector shows; per-byte WASM `readRange` costs
  well under a millisecond per save. Neither is worth the change.
- `PerformanceMetrics` keeps its own 1s engine-status sampler (it builds a history at a
  configurable rate); the other three consumers share `useEngineStatus`.

## OPEN QUESTIONS
- WASM throughput is 5.5× JS today, 7.8× in 2026-09. `-O3` is confirmed applied; cause is
  presumably the #238 toolchain refresh (rustc 1.100 / wasm-opt 133). Unconfirmed, not chased.

- Unmerged remote branches `functional-play`, `gh-pages`, `claude/todo-implementation-Vwp6R`:
  delete or keep? (owner decision; not touched)

## EDIT BOUNDARY (paths this work may touch)

- repo config: `package.json`, `yarn.lock`, `.gitignore`, `.github/workflows/main.yml`,
  `eslint.config.js`, `vite.config.ts`, `vitest.config.ts`, `.husky/`, `scripts/`
- docs: `README.md`, `CLAUDE.md`, `docs/active/*`, `.claude/commands|skills|agents`
- code: `src/**`, `wasm-cpu/**`, `src/version.ts`

<!-- /lcd-resume -->

---

## LOG (append-only; not read on resume)

- 2026-11-21 — Triage → Standard (5 signals; scored Deep by count, rounded down: six independent
  revertible PRs, no single feature spec). Review evidence: gate green (792 tests), coverage
  command broken, `cargo test` 12 pass / 3 fail, main bundle contains the emulation core.
- 2026-11-21 — S1 done, PR #239. S2: coverage provider installed; `global:` threshold key proven
  inert (64.7% passed a 90% floor) then proven live at the top level (99% fails). `no-console`
  rule added, 30 calls routed through LoggingService, 5 debug logs deleted. Prod bundles now keep
  console.warn/error (2 each in main and worker; was 1 and 0). Husky 9 hook rejects a bad message.
- 2026-11-21 — S2 done, PR #240 (one follow-up commit: a test asserted the old console format).
  S3: native host stand-ins in `lib.rs` → `cargo test` 12/3 fail becomes 15 pass; new decimal ADC
  test RED on V only, GREEN after moving the V computation into each branch (17 pass). Parity
  suite vs real WASM (`yarn dev:vite`): 28/28 incl. the new decimal ADC case. `cargo test` in CI.
- 2026-11-21 — S3 done, PR #241. S4: 28 new tests in four `*-review-2026-11` files. Real
  `WorkerState` tests were RED 8/9 against the old WorkerAPI (resume on breakpoint, run-to-cursor
  leak, load-state loop) and exposed an unlisted bug: a failed WASM init left the dead WASM
  engine active (no JS fallback). I/O single-write tests RED 4/4 against old engines. With
  `yarn dev:vite` serving, the same worker tests pass on the real WASM engine (848 total).
  Not done here, moved to S6: Rust B-flag on IRQ/NMI push, `(zp),Y` double read, reset cycle
  counter parity, WASM state transfer gaps.
- 2026-11-21 — S4 done, PR #242. S5: main-thread `Apple1` removed (main chunk 226 → 110 KB,
  gzip 60 → 28 KB; emulator modules in it 34 → 3); Inspector reads `getInspectableTree()` from the
  worker. Debug polling gated by visible debug views + unchanged-payload skip + one fetch on
  pause. Shared `useEngineStatus`. Browser check on WASM: 0 debug polls on Info tab, 8 per 2s on
  Inspector/Debugger; one poke to $D012 prints one char; resume on a breakpoint at $FF2C advances
  one 7-cycle loop; arrows navigate the disassembler with the emulator input focused; console
  clean. Found that the S1 "14×" doc replacement had silently not applied; fixed here and the
  PR #239 description corrected.
