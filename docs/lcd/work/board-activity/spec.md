# Spec: Board live activity

> **Deep lane · Phase 1 of 6 (Specify).** This document owns **what** and **why**. No tech
> stack, no file paths, no function names. Move all of that to `plan.md` in Phase 2.

**Slug:** `board-activity`
**Created:** 2026-11-21
**Related issue:** #247 (follow-up of #246; #248 depends on this)
**Status:** draft <!-- draft | approved | implemented | abandoned -->

---

## Problem

The Board tab draws the Apple 1's parts and buses, but the drawing is static. It looks the same
whether the machine sits at the monitor prompt, runs BASIC or is paused, so it cannot answer the
question the Board exists for: which parts is the 6502 talking to right now? The information is
also not available anywhere else in the app. The emulator does not count bus accesses per part on
either CPU engine today, and on the second engine most memory traffic never reaches the place
where the first engine could count it, so the two engines cannot even be compared.

## User stories

- As someone learning how the Apple 1 works, I want to see which parts the CPU is reading and
  writing while a program runs, so that the memory map stops being a table and becomes
  something I can watch.
- As someone debugging a program, I want a per-part read and write rate, so that I can tell at a
  glance whether my code is touching RAM, waiting on the keyboard or stuck in the monitor.
- As the maintainer, I want both CPU engines to report the same access counts for the same
  program, so that the Board shows the machine and not the engine that happens to be active.

## Acceptance criteria

**AC-1** (surfaces: none): Each bus-addressed part (RAM bank at `$0000`, RAM bank at `$E000`,
monitor PROMs, PIA) keeps a running count of reads and a running count of writes made by the
CPU. Given a known program run for a known number of instructions from reset, the counts equal
the number of bus cycles that program addresses to each part.

**AC-2** (surfaces: none): Given the same program and the same number of executed instructions
from reset, both CPU engines report identical read and write counts for every part. This holds
for a program that touches all four parts, including the PIA.

**AC-3** (surfaces: none): Accesses that do not come from the CPU executing instructions leave
every count unchanged: the memory viewer, the disassembler, a memory write from the debugger,
loading a program or a saved state, and the Board's own refresh.

**AC-4** (surfaces: none): Counting never calls into the CPU engine from inside a bus access.
With counting active on the second engine, a PIA read and a PIA write made by a running program
both complete and the display and keyboard keep working.

**AC-5** (surfaces: RENDER): While the machine runs with the Board open, each bus-addressed part
shows its read rate and its write rate over the last sample interval, in accesses per second.

**AC-6** (surfaces: RENDER): A part with at least one access in the last sample interval is drawn
lit, together with its stub traces to the buses. A part with none is drawn in its normal resting
style. The CPU is lit whenever it executed instructions in the interval, and the address decoder
and the two bus trunks are lit whenever any part was accessed.

**AC-7** (surfaces: RENDER): At the idle monitor prompt, the CPU, the monitor PROMs and the PIA
are lit and the RAM bank at `$E000` is dark and shows a rate of zero. While BASIC runs, the RAM
bank at `$E000` is lit.

**AC-8** (surfaces: RENDER): While the machine is paused, no part is lit and every rate reads
zero. Lighting never hides which part is selected: a selected part still reads as selected
whether it is lit or dark.

**AC-9** (surfaces: RENDER): A reset, a state load or an engine switch never produces a negative
rate or a one-sample spike. The first sample after such an event shows no rate rather than a
wrong one.

**AC-10** (surfaces: RENDER): Lit and dark are not conveyed by colour alone (the rate text is
always there), and the lit state does not animate when the user asks for reduced motion.

**AC-11** (surfaces: none): The cost of counting on headless throughput is measured on both
engines, before and after, and recorded in the performance document with the date and the
numbers. If either engine loses more than 5%, the change is not merged without the owner's
explicit decision.

## Out of scope

- The stepped per-cycle bus flow while paused (#248). This work only settles how engine-side bus
  information reaches the Board.
- Activity for parts that are not on the address bus: the keyboard socket, video out and the
  terminal section. They sit behind the PIA; showing their traffic belongs with the port lines
  (#252).
- Per-address detail (a heat map of which addresses are hot). Counts are per part.
- History, graphs or peak values of the rates. One number per direction per part.
- Activity display outside the Board tab.
- Persisting counts in saved states.
- Any change to what the Board's detail card lists today, other than the new counts appearing.

## Open questions

All answered below with a proposed default. Approving the spec accepts them; change any before
`/lcd:plan`.

- [x] Does the second engine keep RAM and ROM to itself, out of sight of the shared bus?
      **Yes** (investigated 2026-11-21). Only the I/O block crosses over. Counts therefore have
      to be kept by each engine's own bus and proven equal by test (AC-2).
- [x] Is the CPU itself a "part with a rate"? **Proposed: no rate, lit only** (AC-6). The CPU
      originates every access, so its rate would be the sum of the others.
- [x] Do unmapped addresses count anywhere? **Proposed: no.** No part answers, so nothing lights.
- [x] What rate unit? **Proposed: accesses per second**, shortened for display (for example
      `412k/s`), since at about 1 MHz the raw numbers are six digits.
- [x] Is 5% the right throughput budget for AC-11? **Proposed: yes**, as a tripwire that sends
      the decision to the owner, not as a hard limit.

---

<!--
Quality checks before approving this spec:
  - No tech stack named (no language / framework / database appears anywhere)
  - No file paths or function names
  - Every acceptance criterion follows `**AC-N** (surfaces: <CSV>): <body>`
  - Surface tokens are exactly from {CLI, HTTP, MCP, RENDER, DB, EVAL, none}
  - Every acceptance criterion is testable (you can describe an assertion that proves it)
  - Out-of-scope is filled in, even if just one bullet
  - Open questions either all answered, or explicitly flagged for /lcd:plan to resolve
-->
