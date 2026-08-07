# DECISIONS — Apple1JS

> **Append-only decision log.** Broader than an ADR: any decision worth not re-litigating —
> architectural, tooling, naming, process, content-organization — gets a block here. Newest at
> top. **Never rewrite history**: to change a past decision, add a new block and mark the old
> one `superseded by D-NNN`. Work-item-local decisions live in that item's `JOURNAL.md`; mirror
> here only the ones that outlive the work item.

<!-- Next id: D-014 -->

---

## D-013 · 2026-08-06 · Dual-engine parity covers undocumented opcodes, not just documented ones

- **Context:** The hardware-accuracy audit found the reference engine implements ~18 undocumented
  6502 instructions (7 of them incorrectly) while the second engine implements none. The parity
  invariant could be honoured either by scoping it to documented instructions or by making both
  engines implement the full set.
- **Decision:** Parity is literal. Undocumented instructions are corrected in the first engine and
  implemented in the second, so any program produces identical state on both.
- **Alternatives rejected:** Scope the invariant to documented instructions and record the gap —
  cheaper, but leaves the fuzz-parity harness permanently unable to distinguish a real regression
  from a known divergence. Remove them from the first engine — parity by subtraction, and a
  feature downgrade.
- **Scope:** project-wide
- **Status:** active

## D-012 · 2026-08-06 · Power-on memory stays uniformly cleared — a deliberate deviation

- **Context:** Real dynamic memory powers up indeterminate; both engines clear it. Reproducing
  that would surface uninitialised-memory bugs but break byte-for-byte reproducibility.
- **Decision:** Memory continues to power up cleared. Recorded as an intentional deviation in the
  hardware-accuracy audit rather than fixed.
- **Alternatives rejected:** Seeded pseudo-random fill — reproducible, but invalidates existing
  memory-view and saved-state tests for a finding no real software observes. A configuration
  switch — two code paths to keep tested, for the same finding.
- **Scope:** project-wide
- **Status:** active

## D-011 · 2026-08-06 · The reference oracle is per-behaviour, not per-engine

- **Context:** The project has treated the first engine as the reference oracle for parity. The
  hardware-accuracy audit measured the opposite on four points — zero-page pointer wrapping, the
  indirect-jump page bug, the software-interrupt effect on the decimal flag, and indexed store
  timing — where the second engine matches the datasheet and the first does not. The second engine
  meanwhile has no decimal arithmetic at all.
- **Decision:** Neither engine is authoritative by default. The datasheet is the oracle; when the
  engines disagree, the documentation decides which one moves. The first engine keeps its role as
  the always-available fallback and the one testable in CI, which is a separate property from
  being correct.
- **Alternatives rejected:** Keep the first engine authoritative — would have propagated four
  measured defects into the second engine in the name of parity.
- **Scope:** project-wide
- **Status:** active

## D-010 · 2026-06-20 · Published at `apple1.stid.me` via Cloudflare; deploy config stays out of the repo

- **Context:** The demo moved off Netlify to a Cloudflare-hosted subdomain. Cloudflare Pages build
  settings carry account-specific detail.
- **Decision:** Publish at <https://apple1.stid.me/> (canonical link in `index.html`, demo link in
  `README.md`); Netlify is retired (badge removed). The deployment playbook and account IDs are
  **deliberately not in this public repo** — `docs/active/cloudflare-migration-plan.md` is
  gitignored and lives in the maintainer's private vault. Consequently the repo contains no
  `wrangler.toml`, `_headers`, `_redirects`, or `functions/`, and `.github/workflows/` has no deploy
  job: the site stays a plain static build with **no** new zone or surface to map. (PRs #188, #192.)
- **Alternatives rejected:** committing the Cloudflare config for reproducibility — leaks account
  detail in a public repo; staying on Netlify — superseded by the subdomain rollout.
- **Scope:** project-wide
- **Status:** active

## D-009 · 2026-05-30 · WASM core correctness is verified in a browser, not CI

- **Context:** A Rust core change has no automated proof. Native `cargo test` panics on the
  `CPU6502::new()` / `WasmSystem::initialize()` path (they call wasm-bindgen imports), so
  `yarn wasm:test` only covers the pure `bus.rs`/`ram.rs`/`rom.rs` components; the Node-vitest
  engine-parity suites load the wasm-pack "web" build via `fetch()`, absent in Node, so they
  `skipIf` and skip in CI.
- **Decision:** Accept manual browser verification as the real check for the WASM core. A Rust core
  change gets `cargo check` + a (skipped) parity test in CI, plus in-browser verification. Because
  the emulator runs a continuous worker/rAF loop the page never reaches `document_idle`, so
  idle-gated screenshot/page-text tooling times out — drive and inspect via in-page JS, and sample
  transient UI (toasts, ~4s) inside a **single** in-page async loop rather than across tool
  round-trips.
- **Alternatives rejected:** native Rust tests on the CPU/`WasmSystem` path — they panic, so they
  encode a false green; a headless-browser CI job — declined, this is a public repo with no CI
  budget for it.
- **Scope:** project-wide
- **Status:** active

## D-008 · 2026-05-30 · markdownlint is per-file only; repo-wide `lint:md:fix` is forbidden

- **Context:** `yarn lint:md:fix` rewrites every markdown file in the repo. It corrupts the LCD
  machine block in `.claude/rules/lcd-conventions.md` (`__tests__` → `**tests**`,
  `src/**/*` → `src/\*_/_`) and reflows nested lists, because prettier wants 4-space indentation
  and markdownlint MD007 wants 2-space. md-lint is **not** in CI, so the breakage is silent — and
  `lcd-doctor.sh` still passes, since it checks that machine-block keys are present, not that their
  values are valid.
- **Decision:** Lint markdown per-file only — `npx markdownlint-cli2 --fix "<file.md>"` on the files
  actually edited — and never run the repo-wide fix. `maintenance-bundle` in the conventions block
  deliberately uses the read-only `yarn lint:md`.
- **Alternatives rejected:** the repo-wide `lint:md:fix` (the corruption source); reconciling
  prettier and MD007 by configuring one to match the other — not attempted; the per-file rule is
  cheaper than owning that config fight.
- **Scope:** project-wide
- **Status:** active

## D-007 · 2026-05-30 · Tailwind v4 follow-up: cssnano dropped; semantic alias tokens added

- **Context:** Two tech-debt items parked by D-006 + a latent bug found while addressing them:
  components referenced `bg-surface-hover` (7×) and `text-text-disabled` (11×), tokens that did
  not exist in `tokens.ts`/the adapter, so those classes emitted **no CSS** (missing hover lift,
  uncolored disabled text). The parity test only guards adapter→config, never component→token.
- **Decision:** (1) Drop `cssnano` — `@tailwindcss/postcss` + Vite already minify CSS in production
  (verified). (2) Repair the dead classes by **adding** the missing tokens rather than rewriting
  ~18 call sites: `surface.hover` (#334155, alias of `tertiary`), `text.disabled` (#6B7280, alias
  of `muted`). (3) Add `surface.sunken` (#000000) and replace hardcoded `bg-black/{40,20}` with
  `bg-surface-sunken/{40,20}` (identical CSS via opacity modifier); map unmapped-cell
  `text-gray-500!` → `text-text-tertiary!`.
- **Alternatives rejected:** rewriting the 18 refs to existing tokens (`bg-surface-tertiary` /
  `text-text-muted`) — more churn, discards the authors' semantic intent. Error-red mapping,
  `text-black`, and `index.css` base defaults were **deferred** (out of this phase's scope). CRT
  colors remain intentionally exempt (CLAUDE.md).
- **Scope:** project-wide
- **Status:** active

## D-006 · 2026-05-30 · Tailwind v4 adopted compat-first (`@config`); CSS-first `@theme` deferred

- **Context:** Tailwind v3→v4 is a config-paradigm rewrite. `npx @tailwindcss/upgrade`
  defaults to CSS-first — it inlined the token values as hardcoded `@theme` variables and
  deleted `tailwind.config.ts`.
- **Decision:** Adopt the v4 engine **compat-first**: keep `tailwind.config.ts` + the
  `tokens.ts → tailwind-tokens.ts` adapter, load it via `@config "../tailwind.config.ts"` in
  `src/index.css`, and use `@tailwindcss/postcss`. The token single-source-of-truth + its
  parity test stay live. (PR #179.)
- **Alternatives rejected:** the upgrade tool's CSS-first `@theme` inlining — hardcodes token
  values and orphans the adapter + parity test (a token-SSOT downgrade); `@tailwindcss/vite` —
  Rolldown plugin-hook friction under Vite 8. The **CSS-first `@theme` rewrite is deferred** as a
  future modernization (re-architect `tokens.ts` to _emit_ `@theme`, unifying Tailwind utilities
  and runtime inline styles on one set of CSS variables) — not needed; we are fully on v4.
- **Scope:** project-wide
- **Status:** active

## D-005 · 2026-05-28 · Worker-hosted architecture with typed comlink messaging

- **Context:** The emulator must run the CPU loop without blocking the UI thread.
- **Decision:** Run the system in a Web Worker; communicate via `comlink` and type-safe
  `sendWorkerMessage(...)` with messages defined in `src/apple1/types/worker-messages.ts`.
- **Alternatives rejected:** main-thread loop (janks UI); raw `postMessage` (untyped, error-prone).
- **Scope:** project-wide
- **Status:** active <!-- detected at onboarding — confirm/edit -->

## D-004 · 2026-05-28 · WASM build is speed-first

- **Context:** Two viable WASM optimization strategies — size-first vs speed-first.
- **Decision:** Build the WASM CPU speed-first (`opt-level = 3` + `-O3` wasm-opt, ~155 KB release);
  this is what `yarn dev` ships. The old "<100 KB / 90 KB" size-first target is abandoned.
- **Alternatives rejected:** size-first (<100 KB) — slower; not restored without approval.
- **Scope:** project-wide
- **Status:** active <!-- detected at onboarding — confirm/edit -->

## D-003 · 2026-05-28 · Dual-engine 6502 (TypeScript + Rust/WASM)

- **Context:** Wanted both an approachable reference implementation and high throughput.
- **Decision:** Maintain two 6502 engines — a TypeScript reference and a Rust→WASM engine
  (`wasm-cpu/` → `src/wasm/`) — switchable at runtime, with the JS engine as the always-available
  fallback and parity oracle. Test both engines for every engine change.
- **Alternatives rejected:** WASM-only (loses the readable reference + fallback); JS-only (~14× slower).
- **Scope:** project-wide
- **Status:** active <!-- detected at onboarding — confirm/edit -->

## D-002 · 2026-05-28 · Vitest as the test framework

- **Context:** Needed a fast test runner aligned with the Vite toolchain.
- **Decision:** Use Vitest (`jsdom`/`happy-dom` env, `globals: true`), discovery glob
  `src/**/*.vitest.{test,spec}.{js,jsx,ts,tsx}`, tests co-located under `__tests__/`.
- **Alternatives rejected:** Jest (slower with Vite; extra config).
- **Scope:** project-wide
- **Status:** active <!-- detected at onboarding — confirm/edit -->

## D-001 · 2026-05-28 · Yarn (classic) as the package manager

- **Context:** A single lockfile/PM is needed for reproducible installs.
- **Decision:** Use Yarn (`yarn.lock`) for dependency management and script running.
- **Alternatives rejected:** npm / pnpm — no migration reason.
- **Scope:** project-wide
- **Status:** active <!-- detected at onboarding — confirm/edit -->

---

<!-- Template for a new entry — copy above the previous newest, bump "Next id":

## D-NNN · YYYY-MM-DD · <short title>
- **Context:** <what prompted this — the situation/constraint/fork>
- **Decision:** <what we chose, stated plainly>
- **Alternatives rejected:** <one line each, with the why>
- **Scope:** <work-item slug | project-wide>
- **Status:** active   <!-- active | superseded by D-NNN -->

-->
