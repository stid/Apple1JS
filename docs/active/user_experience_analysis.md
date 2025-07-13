# Apple1JS User Experience Analysis

## Overview

This is where I keep notes about UX/UI improvements I've made or want to explore. The focus is on making the emulator feel authentic while adding useful debugging features.

## What's Been Done (July 2025)

### ✅ UI Layout & Design System

**What I built**: A design token system to keep colors and spacing consistent.

**Why I did it**: Colors and spacing were hardcoded everywhere, making it a pain to change anything.

**Key components**:

- `MetricCard`: Standardized data display cards
- `RegisterRow`: Consistent register visualization
- Design tokens in `src/styles/tokens.ts`
- Typography scale for visual hierarchy

### ✅ Visual Polish

**Advanced CRT Effects**: Authentic phosphor persistence, bloom, and barrel distortion.

**Technical implementation**:

- Phosphor decay: 150ms CSS transitions
- Bloom: Radial gradient overlays
- Barrel distortion: CSS transforms
- Performance: Maintains 60fps

### ✅ Integrated Debugger

**Problem solved**: Initial debugger crammed everything into one view - users complained "too compressed".

**Solution implemented**:

- **DebuggerLayout**: Tabbed interface (Overview/Memory/Disassembly)
- **MemoryViewer**: 768-byte hex view with address navigation
- **StackViewer**: Real-time 6502 stack monitor ($0100-$01FF)

**What I learned**:

- People want focused views, not everything crammed together
- Navigation should work the same way everywhere
- Smart scrolling makes navigation feel better

## Ideas to Explore Next

### Execution Control

**The goal**: The debugger is currently read-only. Would be cool to have precise control for debugging vintage software.

**Things to try**:

- [x] Step-by-step execution (CPU already supports it) ✅
- [x] Breakpoint UI with visual indicators ✅
- [x] Auto-follow PC during step execution ✅
- [x] Run-to-cursor in disassembler ✅
- [ ] Conditional breakpoints (e.g., "break when A=$FF")

**Notes to self**:

- Worker messages exist: STEP, SET_BREAKPOINT
- Need UI integration in DebuggerLayout
- Store breakpoints in worker for performance
- Auto-follow PC: Done! It tracks PC during stepping and scrolls automatically

### Memory Analysis

**The problem**: Finding specific data in 64KB is tedious without search.

**Would be nice to have**:

- [ ] Search for bytes/ASCII strings
- [ ] Highlight results in MemoryViewer
- [ ] Navigate between matches
- [x] Memory write support ✅ (Both UI and worker implemented)

**How I might do it**:

- Add search bar to MemoryViewer
- Use worker for efficient searching
- Keep track of results for navigation

### Watch Expressions

**The idea**: Monitor specific values without constantly navigating.

**Features to explore**:

- [ ] Add/remove watch expressions
- [ ] Support memory addresses and registers
- [ ] Update values in real-time

## Fun Hardware Authenticity Ideas

### Audio Package

**Easy things that would add atmosphere**:

- [ ] Keyboard click sounds (mechanical switches)
- [ ] System beeps for errors
- [ ] Volume controls

**How to do it**: Web Audio API with pre-recorded samples

### Visual Enhancements

**More vintage touches**:

- [ ] Power-on sequence (degauss animation)
- [ ] Activity LEDs for I/O operations
- [ ] Phosphor burn-in simulation

### Cassette Interface

**For preserving old software**:

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

## Things That Bug Me

1. ~~**Memory Write**: UI complete but worker lacks implementation~~ ✅ FIXED - Full implementation working
2. **Component Colors**: Some legacy components still hardcode colors
3. **Markdown Formatting**: This file has linting warnings
4. **Tab State Persistence**: ✅ FIXED - Views now maintain their address position when switching tabs

## Things I'm Happy About

- ✅ Runs at 60fps with all effects enabled
- ✅ People like the tabbed debugger layout
- ✅ CRT effects look authentic compared to real photos
- 💭 Curious to see if people will use execution control when I add it
- 💭 Memory search seems like it would be really useful

## What I'd Like to Work on Next (in rough order of coolness)

1. **Execution Control** - Would make debugging way more powerful
2. **Memory Search** - People keep asking for this
3. **Audio Effects** - Easy to add and would be fun
4. **Watch Expressions** - Nice quality of life improvement
5. **Cassette Interface** - Would be cool to load real Apple 1 software

## References

- [6502 Instruction Set](http://www.6502.org/tutorials/6502opcodes.html)
- [Apple 1 Memory Map](http://www.applefritter.com/node/2824)
