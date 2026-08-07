# Spec: Core IC hardware accuracy

> **Deep lane · Phase 1 of 6 (Specify).** This document owns **what** and **why**. No tech
> stack, no file paths, no function names. Move all of that to `plan.md` in Phase 2.

**Slug:** `hw-accuracy`
**Created:** 2026-08-06
**Related issue:** none — findings come from the core IC hardware-accuracy audit committed as the
first commit on this branch
**Status:** draft <!-- draft | approved | implemented | abandoned -->

---

## Problem

An audit of every emulated integrated circuit against its manufacturer documentation and the
Apple 1 hardware description found fifteen behavioural deviations from the original machine. Each
was either measured by driving the emulator and comparing against the datasheet value, or read
directly from the source of the engine that cannot be exercised outside a browser.

Three of them are visible to software the machine actually ran. The peripheral interface adapter
comes up already holding the register values the system monitor is supposed to write, so the
monitor's own startup sequence is misrouted: the write intended for a data-direction register
lands in an output register instead, and a stray character is pushed at the display on every
reset. Reading a peripheral data register clears only one of the two interrupt flags the datasheet
says it clears, and it wrongly clears a flag when the read is decoded to a direction register.

The rest divide into two groups. One engine implements decimal arithmetic and the other ignores
the decimal flag entirely, so the same program produces different results depending on which
engine is selected — a direct violation of the project's dual-engine parity invariant. And on four
separate points — zero-page pointer wrapping, the indirect-jump page bug, the software-interrupt
instruction's effect on the decimal flag, and indexed store timing — the engine currently treated
as the reference oracle is the _less_ accurate of the two, so the project's notion of which engine
is authoritative is itself wrong.

The remainder are latent: correct-looking behaviour that no Apple 1 program happens to exercise,
but that would mislead anyone using this emulator to learn how the hardware works. That is the
stated purpose of the project, which is what makes them worth fixing rather than merely recording.

## User stories

- As someone learning 6502 and Apple 1 hardware from this emulator, I want the emulated parts to
  behave the way the datasheets describe, so that what I learn here transfers to the real machine
  and to other documentation.
- As a developer running a program on this emulator, I want the result to be identical whichever
  processor engine is selected, so that engine choice is a performance decision and never a
  correctness one.
- As someone running original Apple 1 software, I want the machine's startup sequence to have the
  same observable effect it has on real hardware, so that boot behaviour I see here is boot
  behaviour I would see on the original.
- As a maintainer, I want each deviation covered by a test that states the documented behaviour,
  so that a future change cannot silently reintroduce it.

## Acceptance criteria

**AC-1** (surfaces: none): Given the system has just powered on or been reset, when the peripheral
interface adapter's control, data-direction and output registers are read, then every one of them
holds zero, matching the state the part's reset line produces.

**AC-2** (surfaces: none): Given the adapter is in its power-on state, when the system monitor's
startup sequence writes its port-B direction mask, then that value is stored in the port-B
data-direction register and not in the port-B output register.

**AC-3** (surfaces: RENDER): Given a system reset, when the monitor's startup sequence runs to
completion, then no character is emitted to the display as a side effect of that sequence.

**AC-4** (surfaces: none): Given both port-A interrupt flags are set, when the processor reads
peripheral data register A, then both flags are cleared.

**AC-5** (surfaces: none): Given a port-A interrupt flag is set and the control register selects
the data-direction register, when the processor reads that address, then no interrupt flag
changes.

**AC-6** (surfaces: none): Given decimal mode is enabled, when an add-with-carry or
subtract-with-borrow instruction executes, then the accumulator and carry flag follow packed
binary-coded-decimal arithmetic while the negative, zero and overflow flags follow the binary
result — and both engines produce identical register and flag state.

**AC-7** (surfaces: none): Given an indexed-indirect operand whose zero-page pointer base lands on
the last byte of the zero page, when the effective address is formed, then the pointer's high byte
is read from the first byte of the zero page, on both engines.

**AC-8** (surfaces: none): Given an indirect jump whose vector begins on the last byte of a page,
when the jump target is formed, then the target's high byte is read from the first byte of that
same page rather than the next one, on both engines.

**AC-9** (surfaces: none): Given decimal mode is enabled, when the software-interrupt instruction
executes, then decimal mode remains enabled afterwards, on both engines.

**AC-10** (surfaces: none): Given a store or read-modify-write instruction using an indexed
addressing mode, when it executes, then it consumes the fixed cycle count published for that
instruction regardless of whether the index crossed a page boundary — and both engines report the
same total cycle count for the same program.

**AC-11** (surfaces: RENDER): Given a character outside the display's sixty-four-glyph
uppercase repertoire is sent to the display, when it is rendered, then it appears folded into that
repertoire exactly as the original character generator folds it, and a lowercase glyph is never
displayed.

**AC-12** (surfaces: none): Given the accumulator, index registers, stack pointer and decimal flag
hold arbitrary values, when the processor is reset, then the accumulator and both index registers
are unchanged, the stack pointer has decreased by three, and the decimal flag is unchanged — on
both engines.

**AC-13** (surfaces: none): Given the non-maskable interrupt line is idle, when it becomes
asserted, then an interrupt is latched; when it is subsequently released, no further interrupt is
latched.

**AC-14** (surfaces: none): Given any undocumented read-modify-write instruction, when it executes,
then the value written back to memory is the one that instruction's memory operation produces,
independent of the value it leaves in the accumulator — and the complete undocumented instruction
set produces identical register, flag and memory state on both engines.

**AC-15** (surfaces: none): Given the address decoder reproduces the machine's partial decoding,
when any address within the region the peripheral adapter repeats across is read or written, then
it reaches the adapter register that address selects.

**AC-16** (surfaces: none): Given an address that no device answers, when it is read, then the
value returned is the one a floating bus produces on this machine, and both engines return the
same value.

**AC-17** — _withdrawn after implementation._ It required the display busy line to be held for
emulated rather than host time. Delivered, then reverted: the clock only exposes the emulated
cycle count at chunk boundaries — never mid-chunk, and on the second engine it cannot be read
during execution at all — so a cycle-based deadline quantises the display to the chunk rate and
makes character echo stutter. It also could not survive the processor's cycle counter returning to
zero on reset, which stranded the monitor mid-line. The deviation it targeted is recorded as
accepted instead. See Out of scope.

## Out of scope

- **Power-on memory contents.** Real dynamic memory comes up indeterminate; this machine will
  continue to come up uniformly cleared. Deliberate: deterministic memory keeps saved states
  reproducible, the test suite stable and the debugger's memory view meaningful, and the audit
  rated this unobservable by real software. Recorded as an intentional deviation rather than fixed.
- **Sub-instruction bus timing.** Cycle _counts_ are in scope; the read and write activity that
  happens on each individual cycle within an instruction, including dummy reads and the
  read-modify-write double write, is not.
- **Interrupt sampling timing.** Polling interrupts at the penultimate cycle of the preceding
  instruction, and the one-instruction delay after the interrupt-enable and interrupt-disable
  instructions, stay as they are. Neither is observable on this machine.
- **Address decoding beyond the peripheral adapter's mirror.** Any mirroring of memory regions is
  left alone; only the adapter's repeat is modelled, because that is the case documented well
  enough to implement without guessing.
- **The display handshake's timing source (was AC-17).** The busy line stays host-paced. Pacing it
  from emulated time was implemented and then reverted — see AC-17 above. A correct fix needs the
  clock to expose emulated time continuously rather than per chunk, which is a change to the
  execution architecture and well beyond this work-item. The adapter's control-line output modes
  likewise stay unmodelled.
- **Backspace handling in the display.** A deliberate usability addition the original lacks; it
  stays.
- **The processor clock frequency question.** Sources disagree between one megahertz and the
  slightly higher figure derived from the video crystal; settling it needs the machine's schematic,
  which is not in hand. The current value stands.
- **The debugger and any other user interface.** Only the display path is touched, and only where
  an acceptance criterion names it.

## Open questions

None blocking. Two items were raised during the audit and are resolved here rather than left open:

- [x] **Should the emulator reproduce indeterminate power-on memory?** Resolved: no — see Out of
      scope. Determinism was judged worth more than fidelity for a finding no real software
      observes.
- [x] **Does the datasheet forbid an interrupt-flag clear on a direction-register read, or is that
      only the conventional reading?** Resolved as non-blocking: the datasheet states the clear
      happens on a read of the _peripheral data register_, and a direction-register read is a
      different access. AC-5 rests on that reading. No primary source was found stating it
      negatively, so the acceptance criterion is written from the positive statement and flagged
      in the audit as the one finding held at reduced confidence.

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
