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

## In Progress

### 5. 🔄 Complete Formatter Migration
**Status:** ~10 of 97 instances completed

**High-Priority Files:**
- MemoryViewer.tsx - 12 instances
- Disassembler components - Many instances
- Test files - Several instances

**Strategy:**
1. Focus on components with most instances first
2. Update tests alongside implementation
3. Ensure consistent uppercase hex with $ prefix

## Pending Standardizations

### 6. 📋 Worker Communication Type Safety
**Current Issues:**
- Messages not fully type-safe
- Payload structures inconsistent
- Some components bypass WorkerCommunicationService

**Proposed Solution:**
```typescript
// Discriminated union for all messages
type WorkerMessage = 
  | { type: 'STEP'; payload: never }
  | { type: 'SET_BREAKPOINT'; payload: { address: number } }
  | { type: 'DEBUG_DATA'; payload: DebugData }
  // ... etc

// Type-safe message sending
function sendMessage<T extends WorkerMessage>(
  worker: Worker, 
  message: T
): void
```

### 7. 📋 State Management Interface
**Create Standard Interface:**
```typescript
interface IStateful<T> {
  getState(): T;
  setState(state: T): void;
}
```

**Apply to:**
- CPU6502
- RAM/ROM
- PIA6820
- Clock
- Apple1

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
Last updated: 2025-01-07
Current version: 4.18.5