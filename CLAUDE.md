# CLAUDE.md — Dual-Engine CPU Guide

> **Focus**: A runtime-switchable 6502 core with TypeScript and Rust/WASM engines.
> **Principle**: Personal hobby project for learning — keep it fun and exploratory.

## Critical Development Rules

1. **NEVER commit to master** — always use a feature branch (`feat/`, `fix/`,
   `refactor/`, `docs/`, `test/`, `chore/`).
2. **ALWAYS use Context7 MCP** for WASM/Rust documentation (pinned in `.mcp.json`).
3. **Maintain feature parity** between JS and WASM engines; test both for every change.
4. **Keep the JS engine as fallback**; document performance differences.
5. **No `any` types** (strict mode), **no `console.log`** (use LoggingService),
   **no hardcoded colors** (design tokens — except the CRT display).
6. **Bump `src/version.ts`** before every PR — it's the single source of truth
   for the app version (patch/minor/major per branch prefix).

## Quick Start Checklist

```bash
git branch --show-current                         # 1. NEVER work on master
git checkout -b <type>/<description>              # 2. branch if needed
yarn test:ci                                      # 3. verify starting state
cat src/version.ts                                # 4. check version (4.42.7)
yarn wasm:build:release                           # 5. build WASM (release = speed-first)
# 6. Use the task tools for any multi-step work.
```

## Engine Development Commands

```bash
yarn wasm:build:release   # speed-first release build (~155KB) — what yarn dev ships
yarn wasm:build:dev       # debug build, ~10x slower — Rust debugging only
yarn wasm:check           # cd wasm-cpu && cargo check (quick rebuild)
yarn wasm:test            # cd wasm-cpu && cargo test
yarn test                 # all tests, including engine-parity tests
```

Toolchain: rustc 1.70+ (have 1.89.0), wasm-pack 0.12+ (have 0.13.1).
Local `wasm-pack` builds need the rustup toolchain bin on PATH (Homebrew rustc
shadows it).

## WASM Troubleshooting

- **wasm-opt fails**: the metadata key must be profile-scoped —
  `[package.metadata.wasm-pack.profile.release]` — and enable
  `--enable-bulk-memory --enable-nontrapping-float-to-int`.
- **Build from wrong directory**: always `cd wasm-cpu` first (or use the `yarn`
  scripts above).
- **Missing target**: `rustup target add wasm32-unknown-unknown`.
- **Homebrew rustc shadows rustup** — `wasm-pack` fails with
  `wasm32-unknown-unknown target not found in sysroot`. The rustup toolchain has
  the target but Homebrew's `rustc` wins on PATH. Prepend the rustup toolchain
  bin (the concrete bin, not the `~/.cargo/bin` shim) so the WASM rebuild in
  `yarn dev`/`yarn build` works:
  `env PATH="$HOME/.rustup/toolchains/stable-aarch64-apple-darwin/bin:$PATH" yarn dev`.
  For a CSS-only change use `yarn dev:vite` — it reuses the already-built
  `src/wasm/*` and skips the rebuild.

## Performance Tracking

Full detail: `docs/active/wasm-performance.md`. Key facts:

- **Raw throughput** (cycles/sec & IPS) is measured **headless** (`BENCH=1`
  benchmark). WASM ≈ 14× JS.
- ⚠️ **In-app IPS is throttle-locked** by the `Clock` to ~1MHz (both engines
  ~331K) — it does NOT show the WASM gain. Never compare engines by in-app IPS.
- **Host CPU / headroom** (`hostMillisPerSecond`) is the in-app signal of the
  real difference: WASM costs ~3–4× less at the same IPS.
- **WASM binary**: ~155KB release (**speed-first** `opt-level = 3` + `-O3`
  wasm-opt). The old "<100KB / 90KB" target was an abandoned size-first strategy
  — don't restore it without approval.

## Essential Context

**What is Apple1JS?** Browser-based, cycle-accurate Apple 1 emulator
(TypeScript/React) with a **dual-engine** (JS + WASM) 6502 core, worker-based
architecture, runtime engine switching, and comprehensive debugging tools.

**Where things live:**

```text
src/
├── core/        # Emulation engine (CPU, Bus, Memory)
├── apple1/      # System integration, Worker
├── components/  # React UI components
├── services/    # Logging, Worker comm, State persistence
├── contexts/    # React state management
└── hooks/       # Reusable React patterns
```

Dual-engine internals, the migration history, and the WASM directory map live in
`docs/active/wasm-migration-history.md`.

## Recommended Workflow: Explore → Plan → Code → Commit

1. **EXPLORE** — read relevant files; use `docs/active/architecture.md` as the map.
2. **PLAN** — use the task tools for 3+ step work; think through edge cases/tests.
3. **CODE** — follow neighboring patterns; write tests alongside; type-safe.
4. **COMMIT** — run checks (below), then conventional commit.

### Running parallel agents

For multiple agents working different features at once, use git worktrees:
`claude --worktree <name>`. See `docs/active/parallel-agents.md` for the full
workflow, config inheritance, and cleanup.

## Testing Strategy

**ALL TESTS MUST PASS BEFORE COMMITTING.** Never break the suite; add tests for
new features; update tests when behavior changes.

**For core emulation changes, use TDD:** write the failing test first
(`yarn test:watch`), write minimal code to pass, then refactor.

```bash
yarn test          # run all tests
yarn test:watch    # watch mode for TDD
yarn test:ci       # full CI suite
yarn test:coverage # coverage
```

Test guidelines: `docs/active/cpu_test_guidelines.md`.

## Before ANY Commit

```bash
yarn run lint && yarn run type-check && yarn run test:ci
yarn run lint:md:fix    # after editing/creating any markdown
# bump src/version.ts (patch/minor/major)
git add -A && git commit -m "type: description"   # feat:, fix:, docs:, ...
git push
```

## Key Patterns to Follow

- **State management**: _emulated-hardware_ classes (CPU, Bus, RAM, ROM, PIA,
  Clock, Apple1) implement `IVersionedStatefulComponent` with version + migration
  support. These contracts are **scoped to the core/IO layer, not React
  components** — see the applicability rule + audit in
  `docs/active/architecture.md` ("Where these contracts apply"). Presentational
  components (`Actions`, `RegisterRow`, …) must NOT implement them.
- **Formatting**: use the `Formatters` utility (e.g. `Formatters.hexWord(addr)`)
  — never manual `toString(16)`.
- **Worker communication**: type-safe via
  `sendWorkerMessage(worker, WORKER_MESSAGES.SET_BREAKPOINT, address)`. Messages
  defined in `src/apple1/types/worker-messages.ts`.
- **Component inspection**: emulated-hardware classes implement
  `IInspectableComponent`; return structured data from `getInspectable()` for
  debugger visibility. React components _consume_ the inspectable tree (they don't
  implement it).

## UI Work

For UI changes, iterate against visuals: ask for current-state screenshots /
mockups and concrete success criteria up front, then screenshot progress and
iterate 2–3 times.

## GitHub CLI

`gh` is available for PRs, issues, CI status, and CodeQL findings, e.g.:

```bash
gh pr create --title "feat: description" --body "..."
gh pr checks <n>
gh api repos/owner/repo/code-scanning/alerts   # security findings
```

## Success Criteria

1. ✅ All tests pass (`yarn test:ci`)
2. ✅ No lint errors (`yarn lint`)
3. ✅ No type errors (`yarn type-check`)
4. ✅ Version bumped in `src/version.ts`
5. ✅ Feature works as described
6. ✅ No `console.log` left
7. ✅ Docs updated if needed

## Lean Context Development (LCD)

Non-trivial new work (new feature, ≥3 files, or any architecture change) → invoke
`stid-lcd:triage`, which picks a lane (Quick / Standard / Deep) and states it in one line.
Trivial work (typo, one-liner, dep bump, known-cause fix) → go direct, no triage.
Artifacts live under `docs/lcd/` (see `.claude/rules/lcd-conventions.md`).
Project map: `docs/lcd/MAP.md` · Decisions: `docs/lcd/DECISIONS.md`
Resume any work-item after a context reset: `/stid-lcd:resume <slug>`.

## Quick References

- **Documentation Hub**: `docs/README.md`
- **Architecture**: `docs/active/architecture.md`
- **Roadmap & Priorities**: `docs/active/consolidated_roadmap.md`
- **WASM Performance**: `docs/active/wasm-performance.md`
- **Migration History**: `docs/active/wasm-migration-history.md`
- **Parallel Agents**: `docs/active/parallel-agents.md`
- **Test Guidelines**: `docs/active/cpu_test_guidelines.md`
- [6502 Opcodes](http://www.6502.org/tutorials/6502opcodes.html) ·
  [Apple-1 Manual](https://archive.org/details/Apple-1_Operation_Manual_1976_Apple_a)

---

💡 This is a learning project. If something seems interesting to explore, let's do
it — frame ideas as opportunities, not requirements.
