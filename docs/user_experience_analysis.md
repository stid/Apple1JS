# Apple1JS User Experience Analysis

## Overview

This document tracks UX/UI enhancements for Apple1JS, focusing on authentic emulation experience and powerful debugging tools for vintage computing enthusiasts and developers.

## Current State (July 2025)

### ✅ Phase 1: UI Layout & Design System (COMPLETED)

**What we built**: Comprehensive design token system establishing visual consistency.

**Why it mattered**: Previously, colors and spacing were hardcoded throughout components, making theme changes impossible and creating visual inconsistency.

**Key components**:
- `MetricCard`: Standardized data display cards
- `RegisterRow`: Consistent register visualization  
- Design tokens in `src/styles/tokens.ts`
- Typography scale for visual hierarchy

### ✅ Phase 2: Visual Polish (COMPLETED)

**Advanced CRT Effects**: Authentic phosphor persistence, bloom, and barrel distortion.

**Technical implementation**:
- Phosphor decay: 150ms CSS transitions
- Bloom: Radial gradient overlays
- Barrel distortion: CSS transforms
- Performance: Maintains 60fps

### ✅ Phase 3: Integrated Debugger (COMPLETED)

**Problem solved**: Initial debugger crammed everything into one view - users complained "too compressed".

**Solution implemented**:
- **DebuggerLayout**: Tabbed interface (Overview/Memory/Disassembly)
- **MemoryViewer**: 768-byte hex view with address navigation
- **StackViewer**: Real-time 6502 stack monitor ($0100-$01FF)

**Key learnings**:
- Users need focused views, not information density
- Consistent navigation patterns matter (address input like disassembler)
- Smart scrolling improves navigation (up=bottom, down=top)

## Next Priority: Phase 4 - Advanced Debugging

### Execution Control

**Why critical**: Current debugger is read-only. Power users need precise control for debugging vintage software.

**Tasks**:

- [x] Step-by-step execution (CPU already supports it) ✅
- [x] Breakpoint UI with visual indicators ✅
- [ ] Run-to-cursor in disassembler
- [ ] Conditional breakpoints (e.g., "break when A=$FF")

**Implementation notes**: 
- Worker messages exist: STEP, SET_BREAKPOINT
- Need UI integration in DebuggerLayout
- Store breakpoints in worker for performance

### Memory Analysis

**Why critical**: Finding specific data in 64KB is tedious without search.

**Tasks**:
- [ ] Search for bytes/ASCII strings
- [ ] Highlight results in MemoryViewer
- [ ] Navigate between matches
- [ ] Memory write support (UI ready, needs worker)

**Implementation approach**:
- Add search bar to MemoryViewer
- Use worker for efficient searching
- Maintain result indices for navigation

### Watch Expressions

**Why useful**: Monitor specific values without constantly navigating.

**Tasks**:
- [ ] Add/remove watch expressions
- [ ] Support memory addresses and registers
- [ ] Update values in real-time

## Phase 5: Hardware Authenticity

### Audio Package

**Quick wins for authenticity**:
- [ ] Keyboard click sounds (mechanical switches)
- [ ] System beeps for errors
- [ ] Volume controls

**Implementation**: Web Audio API with pre-recorded samples

### Visual Enhancements

**Complete the vintage experience**:
- [ ] Power-on sequence (degauss animation)
- [ ] Activity LEDs for I/O operations
- [ ] Phosphor burn-in simulation

### Cassette Interface

**Preserve software history**:
- [ ] Audio generation for tape save
- [ ] WAV file loading support
- [ ] Visual tape deck UI

## Technical Architecture Notes

### Color System
- Design tokens centralize all colors except CRT
- CRT uses hardcoded #68D391 for authentic phosphor
- Semantic colors: addresses (blue), values (green), flags (amber)

### Debugger Architecture  
- Tabs reduce cognitive load vs all-in-one view
- 500ms refresh balances responsiveness/performance
- 768-byte memory view fits typical debug scenarios

### Performance Considerations
- Web Worker isolation keeps UI responsive
- Message batching reduces overhead
- Virtual scrolling for large data sets

## Known Issues & Technical Debt

1. **Memory Write**: UI complete but worker lacks implementation
2. **Component Colors**: Some legacy components still hardcode colors
3. **Markdown Formatting**: This file has linting warnings

## Success Metrics

- ✅ 60fps with all effects enabled
- ✅ Positive feedback on tabbed debugger
- ✅ CRT effects match reference photos
- ⏳ Execution control adoption (after implementation)
- ⏳ Memory search usage metrics

## Implementation Priority Order

1. **Execution Control** - Highest user value, enables precise debugging
2. **Memory Search** - Most requested feature in feedback
3. **Audio Effects** - Quick wins for authenticity
4. **Watch Expressions** - Improves debugging workflow
5. **Cassette Interface** - Preserves software history

## References

- [6502 Instruction Set](http://www.6502.org/tutorials/6502opcodes.html)
- [Apple 1 Memory Map](http://www.applefritter.com/node/2824)
- Original user feedback threads (internal)