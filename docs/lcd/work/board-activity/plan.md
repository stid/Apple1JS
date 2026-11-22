# Plan: Board live activity

> **Deep lane · Phase 2 of 6 (Plan).** This document owns **how**. Specify ≠ Plan: if you're
> about to write a user story or acceptance criterion, that belongs in `spec.md`.

**Slug:** `board-activity`
**Spec:** [`spec.md`](./spec.md) · **Journal:** [`JOURNAL.md`](./JOURNAL.md)
**Created:** 2026-11-21
**Status:** approved

---

## Goal

Both CPU engines count their own bus accesses per memory page, the worker folds those counts into
per-part totals on the machine tree the Board already polls, and the Board turns two consecutive
samples into read/write rates and a lit or dark state for each part and its traces.

## Architecture

**Count at the CPU's bus-access helper, per 256-byte page.** Each engine has exactly one function
through which the CPU reads and one through which it writes (`CPU6502.read`/`write` in
`src/core/cpu6502/core.ts`; `read_byte_from_bus`/`write_byte_to_bus` in `wasm-cpu/src/cpu.rs`).
Each gets one line: `counts[address >> 8] += 1`. The counters are a 512-slot array, reads in
0–255 and writes in 256–511. The hot path knows nothing about the memory map: no table lookup, no
branch. Every Apple 1 mapping is page-aligned (`$0000–$0FFF`, `$D000–$DFFF`, `$E000–$EFFF`,
`$FF00–$FFFF`), so a part's total is the sum of its pages, computed outside the hot path.

Counting at the CPU rather than in the bus settles AC-3 by construction. The memory viewer,
`readRange`, `seedRamFromBus`, `read_memory`/`write_memory`, program and state loads all reach the
bus without going through the CPU helper, so none of them can count. This replaces the earlier
note in the JOURNAL that the Rust bus would need a separate non-counting path.

**Reset zeroes the counters, in both engines.** The JS reset reads the vector through the counted
helper; the Rust reset reads the bus directly. Rather than align the two reset sequences, both
clear the counters as the last step of reset, so "counts from reset" start at zero on each.

**Read-out.** `ICPUEngine` gains `getPageActivity(): Float64Array` (length 512). `JSEngine`
returns a copy of the CPU's array, `WasmEngine` calls a new `WasmSystem.get_page_activity()` that
returns `Box<[f64]>` (wasm-bindgen copies it into a `Float64Array`; the type involves no `JsValue`,
so the native `cargo test` can call it), and `DualEngine` delegates to the active engine.
`Apple1.getInspectable()` sums the pages of each bus mapping and adds one top-level field to the
tree: `activity: { instructions, parts: { <nodeId>: { reads, writes } } }`. The tree is fetched by
a Comlink call, which the single-threaded worker runs between clock chunks, never from inside a
bus access (rule 7, D-015).

**Board.** A pure module turns the previous and the current sample plus the elapsed time into
`{ readsPerSecond, writesPerSecond, active }` per node, or "no rate" when any counter went
backwards (reset, state load, engine switch: AC-9). `BoardView` keeps the previous sample in a ref,
draws a rate line inside each bus-addressed part, and switches part outline and trace opacity
between a resting and a lit style. Traces get an explicit `part` field in the board data so the
view does not parse ids.

Rejected alternatives are listed under "Risks & rejected alternatives".

**Recon:** no new dependency. One fact checked through Context7 (wasm-bindgen guide, "Boxed number
slices"): `Box<[f64]>` is a supported return type and arrives in JS as a `Float64Array`, copied
out of linear memory.

**Spec amendment (called out):** AC-1 said the counts equal the program's "bus cycles". Neither
engine models the 6502's dummy cycles (an implied instruction is two cycles but one access), so
AC-1 now says "bus accesses the engine performs". Behaviour visible on the Board is unaffected.

## Constitution check

| Rule                                                               | Applies? | Compliance note                                                                                                                                                                   |
| ------------------------------------------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `testing.md` (tests first)                                         | yes      | Failing Rust native test and failing vitest tests before any engine or UI code; red-green loop.                                                                                   |
| `no-downgrade.md`                                                  | yes      | Nothing removed. The Board's detail card, selection and legend keep every element; activity is additive.                                                                          |
| `no-overengineering.md`                                            | yes      | One array per engine, one tree field, one pure UI module. No history, no per-address map, no new worker call.                                                                     |
| `refinement-protocol.md`                                           | yes      | Spec defaults were approved by the owner ("go") before the plan.                                                                                                                  |
| `versioning.md` + CLAUDE.md rule 6                                 | yes      | `feat/` → minor: `4.53.0` → `4.54.0` in `src/version.ts`, in the first code commit. The project keeps the version in `src/version.ts`, which overrides the bundled manifest rule. |
| `commits.md`                                                       | yes      | One conventional commit per red→green flip, pushed.                                                                                                                               |
| `ac-convention.md` — EVAL                                          | no       | Deterministic counters checked by exact equality; no scored output. Matches the conventions' `eval: n/a`.                                                                         |
| CLAUDE.md rule 2 (Context7 for WASM/Rust docs)                     | yes      | Used for the `Box<[f64]>` return type.                                                                                                                                            |
| CLAUDE.md rule 3 + MAP invariant: dual-engine parity               | yes      | Same expected numbers asserted natively in Rust and in JS; a parity test compares the two arrays against real WASM (`yarn dev:vite` serving).                                     |
| CLAUDE.md rule 7 + D-015: no engine call from a bus access         | yes      | Counting is an array increment inside the engine. The read-out happens in a worker message handler. A test runs a PIA read and write under the real WASM engine with counting on. |
| CLAUDE.md rule 5: no `any`, no `console.log`, no hardcoded colours | yes      | Lit style uses existing tokens (`component-*`, `data-*`).                                                                                                                         |
| MAP invariant: WASM build is speed-first                           | yes      | No profile change. AC-11 measures the cost; more than 5% on either engine goes to the owner.                                                                                      |
| MAP invariant: contracts scoped to core/IO                         | yes      | `BoardView` stays presentational; counting lives in the CPU cores.                                                                                                                |
| CLAUDE.md: "a test must fail against the behaviour it replaces"    | yes      | Test programs are chosen so that zero counters, counters in the bus, and a missing reset clear each give a different number than asserted.                                        |
| markdownlint per file only                                         | yes      | Only the files edited here.                                                                                                                                                       |

## Cross-path behavior matrix

Single non-`none` surface (RENDER), listed for the audit's lookup.

| AC      | Surface | Path                           |
| ------- | ------- | ------------------------------ |
| `AC-5`  | RENDER  | `src/components/BoardView.tsx` |
| `AC-6`  | RENDER  | `src/components/BoardView.tsx` |
| `AC-7`  | RENDER  | `src/components/BoardView.tsx` |
| `AC-8`  | RENDER  | `src/components/BoardView.tsx` |
| `AC-9`  | RENDER  | `src/components/BoardView.tsx` |
| `AC-10` | RENDER  | `src/components/BoardView.tsx` |

**Test scope:** `src/components/__tests__/BoardView-board-activity.vitest.test.tsx`,
`src/components/board/__tests__/boardActivity-board-activity.vitest.test.ts`,
`src/apple1/__tests__/Apple1-board-activity.vitest.test.ts`,
`src/core/cpu-engines/__tests__/page-activity-board-activity.vitest.test.ts`,
`src/core/cpu-engines/__tests__/page-activity-parity-board-activity.vitest.test.ts`

## Reused primitives

| Existing primitive                                                       | Path                                                           | Used for                                |
| ------------------------------------------------------------------------ | -------------------------------------------------------------- | --------------------------------------- |
| Machine tree poll (`getInspectableTree`, 500 ms while the Board is open) | `src/components/AppContent.tsx`, `src/apple1/WorkerAPI.ts`     | Carries the counts; no new worker call. |
| `Apple1.getInspectable()` and the mapping constants                      | `src/apple1/index.ts`                                          | Folding pages into parts by node id.    |
| `BOARD_PARTS` / `BOARD_TRACES` / `findNode`                              | `src/components/board/boardModel.ts`                           | Part → node id, trace geometry.         |
| `PartText` line stack                                                    | `src/components/BoardView.tsx`                                 | The rate becomes one more line.         |
| `system_with_program` native test helper                                 | `wasm-cpu/src/system.rs`                                       | Rust tests of the counters.             |
| Parity suite gating (`wasmRuntimeAvailable`, `describe.skipIf`)          | `src/core/cpu-engines/__tests__/engine-parity.vitest.test.ts`  | Same gate for the counter parity test.  |
| `BENCH=1` headless benchmark                                             | `src/core/cpu-engines/__tests__/wasm-benchmark.vitest.test.ts` | AC-11 before/after numbers.             |
| Design tokens and the `eyebrow` legend row                               | `src/styles/tokens.ts`, `src/components/BoardView.tsx`         | Lit style and its legend entry.         |

## Data model / Contracts

```ts
// Engine read-out. Index p (0–255) = reads of page p; 256 + p = writes of page p.
getPageActivity(): Float64Array; // length 512, a copy

// On the machine tree root, data shape in worker-messages.ts
interface BoardActivitySample {
    instructions: number; // executed by the active engine since its last reset
    parts: Record<string, { reads: number; writes: number }>; // key = inspectable node id
}
```

Rust: `page_activity: [u64; 512]` on `CPU6502`; `WasmSystem::get_page_activity() -> Box<[f64]>`.
`f64` holds integers exactly up to 2^53, about 285 years at 1 MHz.

## File structure

> This section is the source of truth for the JOURNAL **EDIT BOUNDARY**.

### New files

```text
src/components/board/boardActivity.ts
    pure: two samples + elapsed time → per-node rates and lit state; rate formatting
src/components/board/__tests__/boardActivity-board-activity.vitest.test.ts
src/components/__tests__/BoardView-board-activity.vitest.test.tsx
src/apple1/__tests__/Apple1-board-activity.vitest.test.ts
    real Apple1: idle monitor and BASIC samples, non-CPU accesses do not count
src/core/cpu-engines/__tests__/page-activity-board-activity.vitest.test.ts
    JS engine counts for a known program; reset clears
src/core/cpu-engines/__tests__/page-activity-parity-board-activity.vitest.test.ts
    JS vs real WASM, including a PIA read and write (skips without a served WASM build)
```

### Modified files

- `wasm-cpu/src/cpu.rs` — counter array, increments in the two bus helpers, clear on reset.
- `wasm-cpu/src/system.rs` — `get_page_activity`; native tests.
- `src/wasm/**` — regenerated bindings (build output, not hand-edited).
- `src/core/cpu6502/core.ts` — counter array, increments in `read`/`write`, clear on reset.
- `src/core/cpu-interface/ICPUEngine.ts` — `getPageActivity`.
- `src/core/cpu-engines/JSEngine.ts`, `WasmEngine.ts`, `DualEngine.ts` — implement it.
- `src/core/cpu-engines/wasm-memory-bridge.ts` — correct the stale header comment only.
- `src/apple1/index.ts` — `activity` on the tree.
- `src/apple1/types/worker-messages.ts` — `BoardActivitySample`.
- `src/test-support/mocks/**` — engine and worker mocks gain the new method or field.
- `src/components/board/boardModel.ts` — `part` on traces.
- `src/components/BoardView.tsx` — rate line, lit style, legend entry.
- `src/components/AppContent.tsx` — only if the sample needs a receive timestamp passed down.
- `src/index.css` — only if the lit style needs a shared atom.
- `src/version.ts` — `4.54.0`.
- `docs/active/wasm-performance.md` — AC-11 numbers.
- `docs/active/architecture.md` — one paragraph on the activity path.
- `docs/lcd/DECISIONS.md` — D-016.
- `docs/lcd/work/board-activity/**`.

## Risks & rejected alternatives

- **Counting inside each bus** (the first idea): rejected because both buses are shared with the
  debugger. The memory viewer would light up RAM by looking at it, and each bus would need a
  second, non-counting entry point on every debug path.
- **Per-part counters in the hot path** (a 64K region table, or a range compare): rejected
  because the engines model the map differently (JS has four named mappings, Rust has three
  region kinds with both RAM banks in one). A page index is the same expression in both.
- **A new worker call for activity**: rejected; the issue asks to reuse the tree poll.
- **Counts on each component's own node `stats`**: rejected because the components do not own the
  numbers (the engine does), and the node appears twice in the tree.
- **Risk: the engines disagree on the number of accesses of some instruction** (read-modify-write
  and indexed modes are the likely places). The parity test will show it. A divergence is fixed in
  the engine that departs from the documented access pattern, with a failing test first; if it
  turns out to be broad, it goes to the owner before the scope grows.
- **Risk: JS throughput.** A typed-array increment per access on the JS engine is the measurable
  cost. AC-11 measures it; the fallback, if the owner wants one, is counting only while the Board
  is open.
- **Risk: four text lines in a 72-unit-high part.** Checked in the browser; the rate line may
  replace the address line's position or the parts grow if it does not fit.
