# Apple1JS Standardization Progress

## Overview
This document tracks the ongoing standardization efforts in the Apple1JS codebase, focusing on improving consistency, maintainability, and code organization.

## Completed Work

### 1. ✅ Debugger Fixes (v4.18.1-4.18.2)
**Issues Fixed:**
- Register values (Y, SP) showing stale/undefined values during stepping
- Assembly view not following cursor when stepping to out-of-view addresses
- Standardized PC property naming between `PC` and `REG_PC`

**Key Changes:**
- Worker now sends complete CPU debug data (`cpu.toDebug()`) instead of just PC
- EmulationContext checks for both `REG_PC` and `PC` for compatibility
- Simplified stepping state management to avoid race conditions
- CPU's `toDebug()` now provides both formatted (`REG_*`) and raw numeric values

### 2. ✅ Unified Formatting Utilities (v4.18.3)
**Created:** `src/utils/formatters.ts`

**Key Functions:**
- `hex(value, width)` - Core hex formatting
- `hexByte(value)` - Format as $XX
- `hexWord(value)` - Format as $XXXX
- `address(value)` - Memory address formatting
- `formatHex(value, width)` - Handles string or number inputs
- `flag(value)` - Returns "SET" or "CLR"
- `decimal(value)` - Number with thousand separators

**Components Migrated:**
- CPU6502 - Uses Formatters in `toDebug()`
- Bus - Uses Formatters for address ranges
- PIA6820 - Uses Formatters for register display
- CompactCpuRegisters - Uses unified formatHex
- AddressLink - Uses appropriate formatters

**Progress:** ~10 of 97 hex formatting instances migrated

### 3. ✅ Type Organization Phase 1 (v4.18.4)
**Consolidated Global Types:**
- Removed duplicate `/src/types/config.ts`
- Moved `/src/@types/Config.ts` → `/src/types/config.ts`
- Created `/src/types/index.ts` for clean exports

**Organized Core Types:**
Created `/src/core/types/` with focused modules:
- `bus.ts` - IoAddressable, BusSpaceType, BusComponentMetadata
- `cpu.ts` - CPU6502State, DisassemblyLine, TraceEntry, debug types
- `clock.ts` - IClockable, TimingStats
- `components.ts` - IInspectableComponent, InspectableData, architecture views
- `io.ts` - IoComponent, IoLogic, WireOptions
- `pubsub.ts` - subscribeFunction, PubSub interface
- `index.ts` - Re-exports all core types

**Updated Core Imports:**
- CPU6502, Bus, PIA6820 now use new type locations
- Fixed type compatibility issues
- Added TODO markers for gradual migration

### 4. ✅ Type Organization Phase 2 (v4.18.5)
**Completed Module Type Migrations:**

#### Apple1 Module (`/src/apple1/types/`)
Created organized structure:
- `emulator-state.ts` - EmulatorState, RAMBankState, PIAState, VideoState
- `video.ts` - VideoBuffer, VideoData, VideoOut types
- `worker-messages.ts` - WORKER_MESSAGES enum, WorkerMessage union, message types
- `index.ts` - Clean exports for all types

#### Components Module (`/src/components/types/`)
- `char-rom.ts` - CHARROM type for character ROM data
- `index.ts` - Exports with TODO for future consolidation

#### Services Module (`/src/services/types/`)
- `logging.ts` - LogHandler type
- `index.ts` - Exports with TODO for future additions

**Key Changes:**
- All `@types/` subdirectories removed
- TSTypes.ts now re-exports from new structure for backward compatibility
- Updated imports in ~15 files to use new paths
- All tests pass with new structure

## Completed Work (Continued)

### 5. ✅ Complete Formatter Migration (v4.19.0)
**Status:** All 97 instances completed

**Migration Summary:**
- ✅ All components now use unified formatters from `src/utils/formatters.ts`
- ✅ Eliminated all `toString(16)` patterns (except in tests and formatters.ts itself)
- ✅ Consistent hex formatting across the entire codebase
- ✅ Type-safe formatting with proper width parameters

**Key Improvements:**
- Consistent hex formatting with appropriate width parameters (1, 2, 4 digits)
- Improved null safety using nullish coalescing over optional chaining
- Eliminated manual toString(16).padStart().toUpperCase() patterns
- Centralized formatting logic for easier maintenance

### 6. ✅ Worker Communication Type Safety (v4.18.7)
**Issues Fixed:**
- Messages now fully type-safe with discriminated union
- Payload structures strictly typed per message type
- Components migrated to use type-safe messaging functions

**Key Changes:**
- Enhanced `WorkerMessage` discriminated union with strict typing
- Added `ClockData` interface replacing `unknown` type
- Created type-safe message creation and sending utilities:
  - `createWorkerMessage()` - Type-safe message construction
  - `sendWorkerMessage()` - Direct worker messaging
  - `sendWorkerMessageWithRequest()` - Request/response pattern
  - `ExtractPayload<T>` - Type extraction utility
- Updated `WorkerCommunicationService` with strict type checking
- Enhanced `isWorkerMessage()` type guard with enum validation
- Migrated `EmulationContext` and `InspectorView` to use new type-safe functions
- Fixed all TypeScript errors and test failures

**Type Safety Improvements:**
```typescript
// Before: any payload type
worker.postMessage({ type: WORKER_MESSAGES.SET_BREAKPOINT, data: address });

// After: compile-time type checking
sendWorkerMessage(worker, WORKER_MESSAGES.SET_BREAKPOINT, address);
```

## Pending Standardizations

### 7. ✅ State Management Interface (v4.18.8)
**Issues Addressed:**
- Inconsistent state serialization across components
- No standardized validation or version handling
- Missing state integrity checking
- Lack of migration support for backward compatibility

**Key Changes:**
- Created comprehensive `IStatefulComponent<T>` interface with:
  - `saveState(options?)` - Configurable state serialization
  - `loadState(state, options?)` - Validation and migration support
  - `validateState(state)` - Type-safe state validation
  - `resetState()` - Consistent initialization
  - `getStateVersion()` - Version tracking support
- Added `IVersionedStatefulComponent` for migration support:
  - `migrateState(oldState, fromVersion)` - Automatic state migration
  - `getSupportedVersions()` - Backward compatibility tracking
- Enhanced CPU6502 with full interface implementation:
  - State versioning (v3.0) with migration from v1.0/v2.0
  - Comprehensive validation with meaningful error messages
  - Optional metadata for debugging and runtime state
  - Backward compatibility for boolean flag conversion
- Created state management utilities:
  - `StateManager` - Type guards and utility functions
  - `StateError` - Specialized error handling
  - `withStateDirtyTracking` - Mixin for change detection
  - `dirtyOnCall` - Decorator for automatic dirty marking

**Type Safety Benefits:**
```typescript
// Before: No validation, manual error handling
cpu.loadState(someState);

// After: Type-safe with validation and migration
const validation = cpu.validateState(someState);
if (validation.valid) {
  cpu.loadState(someState, { validate: true, migrate: true });
}
```

**Components Implemented:**
- ✅ **CPU6502** - Full `IVersionedStatefulComponent` implementation with v3.0 state schema
- ✅ **RAM** - `IVersionedStatefulComponent` with v2.0 state schema including:
  - Comprehensive state validation with byte-level checks
  - Migration support from v1.0 format (legacy `{ data: number[] }`)
  - Size and component ID tracking
  - Backward compatibility maintained for Apple1 system
- ✅ **ROM** - `IVersionedStatefulComponent` with v2.0 state schema including:
  - State preservation for system snapshots
  - Initialization tracking for proper ROM state management
  - Migration support from v1.0 format
  - Read-only semantic preservation after flash operations
- ✅ **PIA6820** - `IVersionedStatefulComponent` with v3.0 state schema including:
  - Complete register state (ORA, ORB, DDRA, DDRB, CRA, CRB)
  - Control line states and transition tracking (CA1/CA2, CB1/CB2)
  - Hardware-controlled pin states (PB7 display status)
  - Performance stats and optimization state preservation
  - Migration support from v1.0/v2.0 formats
  - Apple 1 specific display busy state handling for WOZ Monitor compatibility
- ✅ **Clock** - `IVersionedStatefulComponent` with v2.0 state schema including:
  - Clock configuration (mhz, stepChunk)
  - Execution state tracking (running, paused)
  - Timing state preservation (cycles, elapsed time)
  - Pause management with proper timestamp handling
  - Performance tracking (frame samples, drift compensation, dynamic wait time)
  - Migration support from v1.0 format
  - Automatic clock restart after state load if previously running
- ✅ **Apple1** - `IVersionedStatefulComponent` with v2.0 state schema including:
  - Complete system state management orchestration
  - Delegates to individual component state management
  - System configuration preservation (CPU speed, step interval)
  - Backward compatibility with v1.0 EmulatorState format
  - Automatic clock management during state save/load
  - Video state preservation when available
  - Proper component initialization after reset
  - Migration from legacy save format with component-level delegation

### 8. 📋 Component Update Patterns
**Standardize:**
- Refresh rates (create constants)
- Update hooks (unified pattern)
- Debug update intervals

## Next Session Priorities

1. **Complete Type Migration** (High Priority)
   - Start with apple1/types/
   - Update remaining core imports
   - Clean up old directories

2. **Continue Formatter Migration** (Medium Priority)
   - Focus on high-instance files
   - Maintain consistency

3. **Document Architecture** (Medium Priority)
   - Create architecture diagram
   - Document type hierarchy
   - Update CLAUDE.md

## Code Quality Metrics

### Before Standardization:
- Type definitions in 3+ locations
- 97 inline hex formatting implementations
- Inconsistent naming (PC vs REG_PC)
- Mixed formatting patterns

### After Standardization (Partial):
- Clear type hierarchy established
- Unified formatting utilities created
- Core components migrated to new structure
- Backward compatibility maintained

## Git Branch
All work is on: `refactor/architecture-improvements`

## Notes for Next Session

When resuming:
1. Check `git status` to ensure clean working directory
2. Review this document for context
3. Run `yarn run lint && yarn run type-check` to verify current state
4. Continue with next priority items

## Commands Reference

```bash
# Check current state
yarn run lint && yarn run type-check && yarn run test:ci

# Find remaining hex formatting
grep -r "toString(16)" src --include="*.ts" --include="*.tsx" | wc -l

# Find old type imports
grep -r "from.*@types/" src --include="*.ts" --include="*.tsx"

# Version bump before PR
# Edit src/version.ts then commit
```

---
Last updated: 2025-01-08
Current version: 4.19.0