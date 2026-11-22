# JOURNAL — board-explorer

> **The resume anchor.** The block between the `lcd-resume:v1` markers below is the _entire_
> cold-start payload. Everything below the `---` is history/detail, NOT read on resume.

<!-- lcd-resume:v1 -->

## NOW

- **Lane:** Standard
- **Goal:** Replace the Inspector tab with a Board view (stylised Apple 1 motherboard whose
  parts map to the inspectable tree, click to inspect) and add a Performance tab that gathers
  engine status, engine switcher, performance metrics and profiling. Phase 1 only: UI, no
  engine changes.
- **Next action:** S2, write the failing tests for `boardModel`.
- **Branch:** feat/board-explorer · **Updated:** 2026-11-21 13:00

## STEPS

- [x] S1 — triage, branch, JOURNAL
- [ ] S2 — `boardModel` (parts, traces, `findNode`, `describeNode`) with tests ← next
- [ ] S3 — `BoardView` (SVG board, selection, detail card) with tests
- [ ] S4 — `PerformanceView` (engine status, switcher, metrics, profiling) with tests
- [ ] S5 — wire tabs in `AppContent`, drop the two cards from the Debugger overview, delete
      `InspectorView` and port its tests
- [ ] S6 — docs, version bump (minor), gate, browser check, audit, PR

## DECISIONS (this work-item)

- Board replaces Inspector; Performance is its own tab (owner call, 2026-11-21).
- The board is an original stylised SVG at the "about 15 blocks" level, not the physical layout.
- Several physical parts map to one tree node (terminal section → `video`); selection is by
  node id so the whole group highlights.
- The detail card lists every config and debug field of the node, so nothing the Inspector
  showed is lost (no-downgrade rule).
- Phase 1 composes the existing `EngineSwitcher` and `PerformanceMetrics` unchanged; the
  hero-tile layout from the mockup is a follow-up.
- Activity glow and stepped bus flow are a separate Deep work-item (both engines).

## OPEN QUESTIONS

- none

## EDIT BOUNDARY (paths this work may touch)

- `src/components/board/**`
- `src/components/BoardView.tsx`, `src/components/PerformanceView.tsx`
- `src/components/AppContent.tsx`, `src/components/DebuggerLayout.tsx`
- `src/components/InspectorView.tsx` (delete)
- `src/components/__tests__/**`
- `src/version.ts`, `docs/active/architecture.md`, `docs/active/design-system.md`
- `docs/lcd/work/board-explorer/**`

<!-- /lcd-resume -->

---

## Acceptance criteria

**AC-1** (surfaces: RENDER): The primary tabs are Info, Board, Debugger, Performance. There is
no Inspector tab.

**AC-2** (surfaces: RENDER): Every node of the machine tree (CPU, Bus, ROM, both RAM banks, PIA,
Clock, video, keyboard) is reachable from a board part. Selecting a part shows that node's type,
id and all of its config and debug fields.

**AC-3** (surfaces: RENDER): Parts with no emulation behind them (power supply, expansion
connector, prototyping area) are drawn but are not interactive.

**AC-4** (surfaces: RENDER): The Performance tab shows engine status, the engine switcher, the
performance metrics and the profiling toggle with its results. The Debugger overview no longer
shows the engine switcher or the performance card.

## LOG (append-only; not read on resume)

- 2026-11-21 13:00 — Triage → Standard (4 signals). Mockup approved:
  <https://claude.ai/artifact/UXxoPsqFBqjCY4CTbK62sw>. Inspector inventory mapped to Board /
  Performance (see mockup reply).
