# Apple1JS Architecture

## Overview

Apple1JS is a browser-based Apple 1 computer emulator built with TypeScript and React. It features cycle-accurate 6502 CPU emulation, authentic CRT display with phosphor effects, and comprehensive debugging capabilities.

## Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────────┐
│                        Browser UI Thread                         │
├─────────────────────────────────────────────────────────────────┤
│  React Components                                                │
│  ┌─────────────┐ ┌──────────────┐ ┌────────────────────────┐   │
│  │   App.tsx   │ │ AppContent   │ │   DebuggerLayout       │   │
│  │             │ │              │ │ ┌──────────────────┐   │   │
│  │             │ │  ┌────────┐  │ │ │ MemoryViewer     │   │   │
│  │             │ │  │  CRT   │  │ │ ├──────────────────┤   │   │
│  │             │ │  │Display │  │ │ │ Disassembler     │   │   │
│  │             │ │  └────────┘  │ │ ├──────────────────┤   │   │
│  │             │ │              │ │ │ CPU Registers    │   │   │
│  └─────────────┘ └──────────────┘ └────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  Service Layer                                                   │
│  ┌─────────────────┐ ┌───────────────────┐ ┌─────────────────┐ │
│  │ LoggingService  │ │ WorkerCommService │ │ StatePersistence│ │
│  └─────────────────┘ └───────────────────┘ └─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  React Contexts                                                  │
│  ┌─────────────────┐ ┌───────────────────┐ ┌─────────────────┐ │
│  │EmulationContext │ │DebuggerNavContext│ │ LoggingContext  │ │
│  └─────────────────┘ └───────────────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                               │
                    Worker Message Protocol
                               │
┌─────────────────────────────────────────────────────────────────┐
│                        Web Worker Thread                         │
├─────────────────────────────────────────────────────────────────┤
│  Apple1 System                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                         Apple1                           │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌───────────┐ │   │
│  │  │  Clock   │  │   Bus   │  │ CPU6502 │  │  PIA6820  │ │   │
│  │  │ 1MHz     │  │         │  │         │  │           │ │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └───────────┘ │   │
│  │       │            │ │ │         │             │ │      │   │
│  │       └────────────┘ │ └─────────┘             │ │      │   │
│  │                      │                         │ │      │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────┴─┴────┐ │   │
│  │  │   ROM   │  │  RAM1   │  │  RAM2   │  │ Keyboard  │ │   │
│  │  │ $FF00-  │  │ $0000-  │  │ $E000-  │  │  Logic    │ │   │
│  │  │  FFFF   │  │  0FFF   │  │  EFFF   │  │           │ │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └───────────┘ │   │
│  │                                          ┌───────────┐ │   │
│  │                                          │ Display   │ │   │
│  │                                          │  Logic    │ │   │
│  │                                          └───────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Core Architecture Principles

### 1. Separation of Concerns

- **UI Thread**: React components, user interaction, display rendering
- **Worker Thread**: CPU emulation, memory management, system timing
- **Message Protocol**: Type-safe communication between threads

### 2. Component-Based Design

- Each hardware component implements standardized interfaces
- Components are composable and inspectable
- State management is versioned and migratable

### 3. Type Safety

- Comprehensive TypeScript types throughout
- Discriminated unions for message passing
- Type-safe state serialization

## Module Structure

```text
src/
├── core/               # Core emulation engine
│   ├── types/         # Core type definitions
│   ├── CPU6502.ts     # 6502 processor emulation
│   ├── Bus.ts         # System bus implementation
│   ├── RAM.ts         # RAM component
│   ├── ROM.ts         # ROM component
│   ├── PIA6820.ts     # Peripheral Interface Adapter
│   └── Clock.ts       # System clock
│
├── apple1/            # Apple 1 specific implementation
│   ├── types/         # Apple 1 type definitions
│   ├── index.ts       # Main Apple1 class
│   ├── Apple.worker.ts # Web Worker entry point
│   ├── KeyboardLogic.ts
│   └── DisplayLogic.ts
│
├── components/        # React UI components
│   ├── types/         # Component type definitions
│   ├── App.tsx        # Root component
│   ├── CRT.tsx        # CRT display emulation
│   ├── DebuggerLayout.tsx
│   └── [other components]
│
├── services/          # Service layer
│   ├── types/         # Service type definitions
│   ├── LoggingService.ts
│   ├── WorkerCommunicationService.ts
│   └── StatePersistenceService.ts
│
├── contexts/          # React contexts
│   ├── EmulationContext.tsx
│   ├── DebuggerNavigationContext.tsx
│   └── LoggingContext.tsx
│
├── hooks/             # Custom React hooks
│   ├── useNavigableComponent.ts
│   ├── usePaginatedTable.ts
│   └── useVisibleRows.ts
│
├── utils/             # Utility functions
│   ├── formatters.ts  # Unified formatting utilities
│   └── [other utils]
│
├── constants/         # Application constants
│   ├── memory.ts      # Memory layout constants
│   ├── system.ts      # System configuration
│   └── ui.ts          # UI timing constants
│
└── types/            # Global type definitions
    ├── config.ts
    └── index.ts
```

## Key Interfaces

### IInspectableComponent

Every hardware component implements this interface for debugging:

```typescript
interface IInspectableComponent {
    id: string;
    type: string;
    name?: string;
    children?: IInspectableComponent[];
    getInspectable(): InspectableData;
}
```

### IVersionedStatefulComponent

Components with state implement this for serialization:

```typescript
interface IVersionedStatefulComponent<TState> {
    saveState(options?: StateOptions): TState;
    loadState(state: TState, options?: StateOptions): void;
    validateState(state: unknown): StateValidationResult;
    resetState(): void;
    getStateVersion(): string;
    migrateState(oldState: unknown, fromVersion: string): TState;
    getSupportedVersions(): string[];
}
```

### IClockable

Components that respond to clock cycles:

```typescript
interface IClockable {
    getCompletedCycles(): number;
    performSingleStep(): number;
    performBulkSteps(steps: number): void;
}
```

## Memory Map

The Apple 1 memory layout is faithfully reproduced:

| Address Range | Size | Component | Description |
|--------------|------|-----------|-------------|
| $0000-$0FFF | 4KB | RAM Bank 1 | Main RAM (includes zero page, stack) |
| $D010-$D013 | 4B | PIA 6820 | Keyboard and display I/O |
| $E000-$EFFF | 4KB | RAM Bank 2 | Extended RAM (for BASIC) |
| $FF00-$FFFF | 256B | ROM | WOZ Monitor |

## Worker Communication

Communication between UI and Worker threads uses a type-safe message protocol:

```typescript
enum WORKER_MESSAGES {
    UPDATE_VIDEO_BUFFER,
    KEY_DOWN,
    DEBUG_INFO,
    CLOCK_DATA,
    SAVE_STATE,
    LOAD_STATE,
    // ... etc
}

// Type-safe message creation
sendWorkerMessage(worker, WORKER_MESSAGES.SET_BREAKPOINT, address);
```

## State Management

### Component State

Each component manages its own state with versioning:

- Current versions: CPU (v3.0), RAM/ROM (v2.0), PIA (v3.0), Clock (v2.0), Apple1 (v2.0)
- Migration support for backward compatibility
- Validation ensures state integrity

### UI State

React contexts manage UI-level state:

- **EmulationContext**: Execution control, breakpoints, debugging
- **DebuggerNavigationContext**: Component navigation
- **LoggingContext**: UI logging with history

## Performance Considerations

### Web Worker Isolation

- CPU emulation runs in separate thread
- Prevents UI blocking during execution
- Message batching reduces overhead

### Update Optimization

- Components use standardized refresh rates
- Virtual scrolling for large data sets
- Memoization prevents unnecessary re-renders

### Memory Efficiency

- Typed arrays for memory storage
- Efficient bit manipulation for CPU flags
- Minimal object allocation in hot paths

## Debugging Features

### Integrated Debugger

- Real-time CPU state inspection
- Memory viewer with hex editor
- Disassembler with execution tracking
- Stack viewer
- Breakpoint management

### Component Inspector

- Hierarchical view of all components
- Real-time state inspection
- Performance metrics
- No performance impact when closed

## Code Standards

### TypeScript

- Strict mode enabled
- Comprehensive type coverage
- No `any` types
- Discriminated unions for variants

### React Patterns

- Functional components with hooks
- Proper memoization
- Context for cross-cutting concerns
- Custom hooks for reusable logic

### Testing

- Unit tests for core components
- Integration tests for complex features
- ~90% coverage for critical paths
- Custom test utilities for consistency

## Future Extensibility

The architecture supports:

- Additional peripherals (cassette, printer)
- Different CPU speeds
- Alternative ROM images
- Custom memory configurations
- Additional debugging tools
