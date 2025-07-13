# Apple1JS Roadmap

> This roadmap captures planned improvements and features for the Apple1JS emulator.
> Priority levels: 🔴 High | 🟡 Medium | 🟢 Low

## 🔴 High Priority - Core Functionality

### 1. Memory Search Capability

**Status:** Not implemented  
**Description:** Add search functionality to the memory viewer for finding bytes or ASCII strings

#### Tasks

- Add search bar UI to MemoryViewerPaginated
- Implement worker message for memory search
- Add results highlighting and navigation
- Support both hex and ASCII search modes

### 2. Split CPU6502.ts into Smaller Modules

**Status:** Planning  
**File Stats:** 2583 lines, 68KB - too large for 200K token context  

#### Proposed Structure

- `cpu6502/opcodes.ts` - Opcode table and definitions
- `cpu6502/instructions.ts` - Instruction implementations (adc, sbc, etc.)
- `cpu6502/addressing.ts` - Addressing mode implementations
- `cpu6502/core.ts` - Main CPU class with state management
- `cpu6502/debug.ts` - Debugging and inspection functionality

### 3. ~~Fix Memory Write Worker Implementation~~ ✅

**Status:** COMPLETED  
**Description:** Memory editing is fully implemented in both UI and worker
**Implementation:** WRITE_MEMORY message handler in Apple.worker.ts:332

### 4. Clean Up Console Usage

**Status:** Multiple files need migration  

#### Files to Update

- WorkerCommunicationService.ts
- StatePersistenceService.ts  
- Error.tsx
- errors.ts
**Action:** Replace all console.log/warn/error with LoggingService

## 🟡 Medium Priority - Enhanced Debugging

### 5. Conditional Breakpoints

**Status:** Not implemented  
**Description:** Break when specific conditions are met (e.g., "A=$FF", "X>$80")

#### Tasks

- Extend breakpoint UI to accept conditions
- Add condition parser and evaluator in worker
- Store conditions with breakpoints

### 6. Watch Expressions

**Status:** Not implemented  
**Description:** Monitor specific memory addresses and registers without navigation

#### Tasks

- Create WatchPanel component
- Add worker support for monitoring addresses
- Real-time updates during execution
- Persist watch list in state

### 7. Performance Profiling UI

**Status:** Backend exists, no UI  
**Description:** CPU6502 has profiling capabilities but no UI to display the data

#### Tasks

- Create ProfilerPanel component
- Display instruction counts and timing
- Add export functionality

## 🟢 Low Priority - User Experience

### 8. Audio Package

**Status:** Not implemented  

#### Features

- Keyboard click sounds (mechanical switches)
- System beep for errors
- Volume controls
- Web Audio API implementation

### 9. Visual Enhancements

**Status:** Ideas stage  

#### Features

- Power-on degauss animation
- Activity LEDs for I/O operations
- Phosphor burn-in simulation
- More authentic CRT effects

### 10. Cassette Interface

**Status:** Not implemented  
**Description:** Load/save programs via audio

#### Features

- WAV file loading
- Audio generation for tape save
- Visual tape deck UI

## 🔧 Technical Debt

### 11. Complete PIA6820 Implementation

**Files:** PIA6820.ts  
**TODOs:** CA2 and CB2 output modes for full 6820 compliance

### 12. Implement WebCRT CLEAR Command

**File:** WebCRTVideo.ts:194  
**Status:** Command exists but not implemented

### 13. Step Over Functionality

**File:** EmulationContext.tsx:149  
**Status:** UI exists but worker implementation missing

### 14. Remove TSTypes.ts

**Status:** Migration in progress  
**Action:** Update all imports to use './types' directly

### 15. Fix Alert Usage

**File:** AppContent.tsx:174  
**Action:** Replace alert() with proper error handling

## 📚 Documentation & Architecture

### 16. Update Architecture Documentation

**Status:** Needs refresh after recent refactoring

#### Tasks

- Update module structure diagrams
- Document new service layer
- Add sequence diagrams for key flows

### 17. Component Color Standardization

**Status:** Some components still hardcode colors
**Action:** Audit and update to use design tokens

### 18. Documentation Organization

**Status:** In progress

#### Tasks

- Complete active/archive folder organization
- Remove redundant analysis files
- Update cross-references

## 🚀 Future Ideas

### 19. Network/Multi-player Support

**Description:** Connect multiple emulators

#### Use Cases

- Shared memory spaces
- Multi-user debugging sessions
- Historical accurate BBS simulation

### 20. Assembly Development Environment

**Description:** Integrated 6502 assembly development

#### Features

- Syntax highlighting
- Live assembly and loading
- Symbol table support
- Source-level debugging

### 21. Hardware Expansion Cards

**Description:** Emulate popular Apple 1 expansions

#### Options

- Cassette interface card
- Serial interface
- Additional RAM/ROM cards

## 📊 Progress Tracking

### Recently Completed ✅

- Execution control (step, breakpoints, run-to-cursor)
- Memory editing UI and worker support
- Auto-follow PC during stepping
- Tabbed debugger interface
- Design token system

### In Progress 🚧

- System alert badge sizing (just completed)
- Documentation organization

### Not Started ❌

- Most items in this roadmap

---

**Last Updated:** July 2025  
**Note:** This is a living document for a hobby project - no deadlines or commitments!
