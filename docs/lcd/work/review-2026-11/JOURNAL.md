# JOURNAL — review-2026-11

> **The resume anchor.** The block between the `lcd-resume:v1` markers below is the _entire_
> cold-start payload. `/lcd:resume` reads MAP.md + this block + DECISIONS headers and nothing
> else. Everything below the `---` is history/detail, NOT read on resume.

<!-- lcd-resume:v1 -->

## NOW

- **Lane:** Standard
- **Goal:** Address every finding of the 2026-11-21 project health review as six stacked PRs
  (each branch is cut from the previous one; each bumps `src/version.ts`).
- **Next action:** S3 — `fix/wasm-adc-decimal-overflow` (cut from `fix/real-checks`); add `cargo test` to CI there
- **Branch:** fix/real-checks · **Updated:** 2026-11-21

## STEPS

- [x] S1 `chore/review-cleanup` — no behaviour change: untrack `wasm-cpu/src/wasm/`, drop unused
      packages and dead scripts, stale `.gitignore` entries, stale docs (Jest, 14×, WASM size).
- [x] S2 `fix/real-checks` — coverage provider + valid thresholds, husky 9 wiring for commitlint,
      `no-console` lint rule (+ route existing calls through LoggingService), keep
      `console.error`/`warn` in prod bundles, CI: release WASM, `yarn build`, `cargo test`, clippy,
      frozen lockfile, single run per PR.
- [ ] S3 `fix/wasm-adc-decimal-overflow` — native stubs for the wasm-bindgen imports so CPU code
      runs under `cargo test`; failing ADC decimal V test; fix; parity suite vs real WASM.
- [ ] S4 `fix/debugger-correctness` — tests first, on a real `Apple1` + `WorkerAPI`: resume on a
      breakpoint, double clock loop on load, clock tick exception, run-to-cursor transient
      breakpoint, WASM double I/O write, migrate-before-validate, awaited loadState, inspector
      placeholder values, disassembler key guard.
- [ ] S5 `refactor/inspector-and-polling` — remove the main-thread `Apple1`; inspector tree from
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

## OPEN QUESTIONS

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
