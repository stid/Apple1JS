# Apple1JS Type Hierarchy

## Overview

This document describes the type system organization and hierarchy in Apple1JS. The types are organized by module to maintain clear boundaries and dependencies.

## Type Organization Structure

```text
src/
├── types/                    # Global shared types
│   ├── config.ts            # Application configuration
│   ├── logging.ts           # Logging configuration types
│   ├── index.ts             # Re-exports
│   └── ui/                  # UI-specific types
│
├── core/types/              # Core emulation types
│   ├── bus.ts               # Bus and addressing types
│   ├── clock.ts             # Clock and timing types
│   ├── components.ts        # Component inspection types
│   ├── cpu.ts               # CPU state and debug types
│   ├── io.ts                # I/O component types
│   ├── pubsub.ts            # Event system types
│   ├── state.ts             # State management types
│   └── index.ts             # Core type exports
│
├── apple1/types/            # Apple 1 specific types
│   ├── emulator-state.ts    # System state types
│   ├── video.ts             # Video display types
│   ├── worker-messages.ts   # Worker communication types
│   └── index.ts             # Apple1 type exports
│
├── components/types/        # UI component types
│   ├── char-rom.ts          # Character ROM data
│   └── index.ts             # Component type exports
│
└── services/types/          # Service layer types
    ├── logging.ts           # Logging types
    └── index.ts             # Service type exports
```

## Core Type Hierarchies

### 1. Component Hierarchy

```typescript
IInspectableComponent
├── CPU6502
├── Bus
├── RAM
├── ROM
├── PIA6820
├── Clock
└── Apple1

IVersionedStatefulComponent<TState>
├── CPU6502 (v3.0)
├── RAM (v2.0)
├── ROM (v2.0)
├── PIA6820 (v3.0)
├── Clock (v2.0)
└── Apple1 (v2.0)

IClockable
├── CPU6502
└── (extensible for other timed components)
```

### 2. State Type Hierarchy

```typescript
StateBase
├── CPU6502State
│   ├── version: string
│   ├── registers (PC, A, X, Y, S)
│   ├── flags (N, Z, C, V, I, D)
│   ├── interrupt state
│   └── metadata (optional)
│
├── RAMState
│   ├── version: string
│   ├── data: number[]
│   ├── size: number
│   └── componentId: string
│
├── ROMState
│   ├── version: string
│   ├── data: number[]
│   ├── size: number
│   ├── initialized: boolean
│   └── componentId: string
│
├── PIA6820State
│   ├── version: string
│   ├── registers (ORA, ORB, DDRA, DDRB, CRA, CRB)
│   ├── controlLines (CA1, CA2, CB1, CB2)
│   ├── pb7InputState: boolean
│   └── componentId: string
│
├── ClockState
│   ├── version: string
│   ├── configuration (mhz, stepChunk)
│   ├── execution state (running, paused)
│   ├── timing metrics
│   └── performance tracking
│
└── Apple1State
    ├── version: string
    ├── system configuration
    ├── component states (nested)
    └── video state (optional)
```

### 3. Message Type Hierarchy

```typescript
WorkerMessage (Discriminated Union)
├── Command Messages (UI → Worker)
│   ├── SET_CRT_BS_SUPPORT_FLAG
│   ├── KEY_DOWN
│   ├── LOAD_STATE
│   ├── SET_BREAKPOINT
│   └── [others]
│
└── Response Messages (Worker → UI)
    ├── UPDATE_VIDEO_BUFFER
    ├── DEBUG_DATA
    ├── STATE_DATA
    ├── BREAKPOINT_HIT
    └── [others]
```

### 4. I/O Component Hierarchy

```typescript
IoComponent<TState>
├── WebCRTVideo
│   └── State: VideoState
│
└── WebKeyboard
    └── State: void

IoLogic<TInput, TOutput>
├── KeyboardLogic
│   ├── Input: string
│   └── Output: void
│
└── DisplayLogic
    ├── Input: void
    └── Output: string | number
```

## Type Safety Patterns

### 1. Discriminated Unions

Used for type-safe message handling:

```typescript
type WorkerMessage =
  | { type: WORKER_MESSAGES.KEY_DOWN; data: string }
  | { type: WORKER_MESSAGES.SET_BREAKPOINT; data: number }
  | { type: WORKER_MESSAGES.STATE_DATA; data: EmulatorState }
  // ... etc
```

### 2. Generic Constraints

Used for component interfaces:

```typescript
interface IStatefulComponent<TState extends StateBase> {
    saveState(options?: StateOptions): TState;
    loadState(state: TState, options?: StateOptions): void;
}
```

### 3. Type Guards

Used for runtime type checking:

```typescript
function isWorkerMessage(data: unknown): data is WorkerMessage {
    return typeof data === 'object' && 
           data !== null && 
           'type' in data &&
           Object.values(WORKER_MESSAGES).includes(data.type);
}
```

### 4. Utility Types

Common patterns extracted:

```typescript
// Extract payload type for a message
type ExtractPayload<T extends WORKER_MESSAGES> = 
    Extract<WorkerMessage, { type: T }> extends { data: infer D } 
    ? D 
    : never;

// Component metadata
type WithBusMetadata<T> = T & {
    __address?: string;
    __addressRange?: [number, number];
    __addressName?: string;
};
```

## Type Migration Status

### Migration Completed (2025-01-08)

The type migration from `src/core/@types/` to the new structure has been **completed**. All imports have been updated and the old `@types` directory has been removed.

**Migration Summary**:

- ✅ All types moved to their appropriate locations
- ✅ All imports updated (18 component files, 13 test files)
- ✅ `isInspectableComponent` helper added to `components.ts`
- ✅ Old `src/core/@types/` directory removed
- ✅ All tests passing

**Import Changes**:

- `import { IInspectableComponent } from '../core/@types/IInspectableComponent'`  
  → `import { IInspectableComponent } from '../core/types/components'`
- `import { BusSpaceType } from '../@types/IoAddressable'`  
  → `import { BusSpaceType } from '../types/bus'`

## Type Dependencies

```text
┌─────────────┐
│   Global    │ (config.ts)
└──────┬──────┘
       │
┌──────▼──────┐
│    Core     │ (bus, cpu, clock, components, io, pubsub, state)
└──────┬──────┘
       │
┌──────▼──────┐
│   Apple1    │ (emulator-state, video, worker-messages)
└──────┬──────┘
       │
┌──────▼──────┐
│ Components  │ (char-rom, UI types)
└──────┬──────┘
       │
┌──────▼──────┐
│  Services   │ (logging, worker communication)
└─────────────┘
```

## Best Practices

### 1. Type Location

- Place types in the module that owns them
- Export from index.ts for clean imports
- Avoid circular dependencies

### 2. Type Naming

- Interfaces: `ISomething` or descriptive names
- State types: `ComponentNameState`
- Constants: `UPPER_SNAKE_CASE`
- Enums: PascalCase

### 3. Type Documentation

- Document complex types with JSDoc
- Provide examples for utility types
- Explain discriminated union variants

### 4. Type Evolution

- Version state interfaces
- Provide migration functions
- Maintain backward compatibility

## Common Type Patterns

### State Management

```typescript
interface ComponentState extends StateBase {
    version: string;
    // component-specific fields
}
```

### Message Creation

```typescript
createWorkerMessage(
    WORKER_MESSAGES.SET_BREAKPOINT, 
    address
);
```

### Component Inspection

```typescript
interface InspectableData {
    id: string;
    type: string;
    name?: string;
    state?: Record<string, unknown>;
    stats?: Record<string, string | number>;
    children?: InspectableChild[];
}
```

### Formatting

```typescript
Formatters.hex(value, width);     // General hex
Formatters.hexByte(value);        // $XX
Formatters.hexWord(value);        // $XXXX
Formatters.address(value);        // Memory address
```
