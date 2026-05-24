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
│  ┌─────────────────┐ ┌─────────────────┐ ┌───────────────────┐ │
│  │ LoggingService  │ │ WorkerManager   │ │ StatePersistence  │ │
│  └─────────────────┘ └─────────────────┘ └───────────────────┘ │
│  ┌─────────────────┐ ┌───────────────────┐                     │
│  │ WorkerDataSync  │ │ WorkerCommService │                     │
│  └─────────────────┘ └───────────────────┘                     │
├─────────────────────────────────────────────────────────────────┤
│  React Contexts                                                  │
│  ┌─────────────────┐ ┌───────────────────┐ ┌─────────────────┐ │
│  │EmulationContext │ │DebuggerNavContext│ │ LoggingContext  │ │
│  └─────────────────┘ └───────────────────┘ └─────────────────┘ │
│  ┌──────────────────┐                                           │
│  │WorkerDataContext │                                           │
│  └──────────────────┘                                           │
└─────────────────────────────────────────────────────────────────┘
                               │
                    Comlink RPC Communication
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
- **Communication**: Comlink RPC for type-safe worker interaction

### 2. Component-Based Design

- Each hardware component implements standardized interfaces
- Components are composable and inspectable
- State management is versioned and migratable

### 3. Type Safety

- Comprehensive TypeScript types throughout
- Type-safe RPC with Comlink
- Organized type hierarchy in dedicated type directories
- Type-safe state serialization with versioning

## Module Structure

```text
src/
├── core/               # Core emulation engine
│   ├── types/         # Core type definitions
│   ├── cpu6502/       # 6502 processor emulation (modular)
│   │   ├── types.ts   # CPU interfaces and types
│   │   ├── opcodes.ts # Opcode table (256 entries)
│   │   ├── addressing.ts # Addressing mode implementations
│   │   ├── instructions.ts # Instruction implementations
│   │   ├── debug.ts   # Debugging functionality
│   │   ├── core.ts    # Main CPU class
│   │   └── index.ts   # Module exports
│   ├── Bus.ts         # System bus implementation
│   ├── RAM.ts         # RAM component
│   ├── ROM.ts         # ROM component
│   ├── PIA6820.ts     # Peripheral Interface Adapter
│   └── Clock.ts       # System clock
│
├── apple1/            # Apple 1 specific implementation
│   ├── types/         # Apple 1 type definitions
│   ├── index.ts       # Main Apple1 class
│   ├── Apple.worker.comlink.ts # Comlink-based worker
│   ├── WorkerAPI.ts   # Worker API implementation
│   ├── WorkerState.ts # Encapsulated worker state
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
│   ├── WorkerManager.ts      # Worker lifecycle management
│   ├── WorkerDataSync.ts     # Worker data synchronization
│   ├── WorkerCommunicationService.ts
│   └── StatePersistenceService.ts
│
├── contexts/          # React contexts
│   ├── EmulationContext.tsx
│   ├── DebuggerNavigationContext.tsx
│   ├── LoggingContext.tsx
│   └── WorkerDataContext.tsx  # Worker data provider
│
├── hooks/             # Custom React hooks
│   ├── useNavigableComponent.ts
│   ├── usePaginatedTable.ts
│   ├── useVisibleRows.ts
│   ├── useWorkerState.ts        # Generic worker state sync
│   ├── useWorkerDebugInfo.ts    # Debug info synchronization
│   └── useWorkerBreakpoints.ts  # Breakpoint management
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

### Where these contracts apply (and where they must NOT)

`IInspectableComponent` and `IVersionedStatefulComponent` model the **emulated
hardware tree** — they belong to the core/IO classes that own simulated state and
appear in the debugger, NOT to the React presentation layer.

**Rule of thumb — do NOT apply blanket:**

- **Implement the contracts** when a class _is_ a piece of emulated hardware that:
  - owns persisted/serializable state that must survive save/load and needs
      versioned migration → `IVersionedStatefulComponent`, and/or
  - exposes debug-inspectable state to the Inspector/architecture view →
      `IInspectableComponent` (`getInspectable()`).
- **Do NOT implement the contracts** on:
  - React components in `src/components/**`. They render the UI and _consume_ the
      inspectable tree (typically as an `apple1Instance: IInspectableComponent` prop);
      they hold only ephemeral view state via hooks/contexts, which is not the
      versioned-hardware state these contracts describe.
  - Purely presentational / stateless helpers (e.g. `Actions`, `RegisterRow`,
      `MetricCard`, the CRT render subtree).

CodeRabbit's coding-guideline that flags missing contract implementations must be
read with this scope: it is meaningful for new **core/IO hardware classes**, and a
false positive for presentational React components.

#### Current implementers (the only classes that should implement these)

| Class      | File                        | `IInspectableComponent` | `IVersionedStatefulComponent` |
| ---------- | --------------------------- | :---------------------: | :---------------------------: |
| `Apple1`   | `src/apple1/index.ts`       |           ✅            |              ✅               |
| `Bus`      | `src/core/Bus.ts`           |           ✅            |               —               |
| `Clock`    | `src/core/Clock.ts`         |           ✅            |              ✅               |
| `CPU6502`  | `src/core/cpu6502/core.ts`  |           ✅            |              ✅               |
| `PIA6820`  | `src/core/PIA6820.ts`       |           ✅            |              ✅               |
| `RAM`      | `src/core/RAM.ts`           |           ✅            |              ✅               |
| `ROM`      | `src/core/ROM.ts`           |           ✅            |              ✅               |
| `CRTVideo` | `src/apple1/WebCRTVideo.ts` |           ✅            |               —               |
| `Keyboard` | `src/apple1/WebKeyboard.ts` |           ✅            |               —               |

#### Component audit — `src/components/**` (none should implement the contracts)

All entries below are React presentation / UI helpers. None own versioned hardware
state or produce an inspectable node, so the contracts are **N/A** for every one.

| Component                                                                                         | Role                                                                    |          Contracts apply?          |
| ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | :--------------------------------: |
| `App`                                                                                             | Root shell, passes `apple1Instance` prop                                |        N/A (presentational)        |
| `AppContent`                                                                                      | Orchestration; calls worker `saveState`/`loadState` (delegates to core) |   N/A (no owned versioned state)   |
| `Main`                                                                                            | Layout, threads `apple1Instance` prop                                   |        N/A (presentational)        |
| `Actions`                                                                                         | Button + ref file-load control                                          |          N/A (stateless)           |
| `AddressLink` / `SmartAddress`                                                                    | Address rendering / navigation                                          |        N/A (presentational)        |
| `CompactCpuRegisters` / `RegisterRow`                                                             | Register display                                                        |        N/A (presentational)        |
| `ExecutionControls` / `CompactExecutionControls`                                                  | Run/step buttons                                                        |        N/A (presentational)        |
| `EngineSwitcher`                                                                                  | Engine toggle control                                                   |        N/A (presentational)        |
| `CRT`, `CRTCursor`, `CRTRow`, `CRTRowChar`, `CRTRowCharRom`, `CRTWorker`, `CharRomCanvasRenderer` | CRT render subtree                                                      | N/A (presentational/render helper) |
| `DebuggerLayout`                                                                                  | Debugger layout; consumes `root: IInspectableComponent`                 |           N/A (consumer)           |
| `InspectorView` / `InspectTree`                                                                   | Render the inspectable tree (calls `getInspectable()` on the core root) |  N/A (consumer, not implementer)   |
| `DisassemblerPaginated`                                                                           | Disassembly view                                                        |     N/A (view state via hooks)     |
| `MemoryViewerPaginated`                                                                           | Memory view                                                             |     N/A (view state via hooks)     |
| `StackViewer`                                                                                     | Stack view                                                              |        N/A (presentational)        |
| `PaginatedTableView`                                                                              | Generic paginated table                                                 |        N/A (presentational)        |
| `PerformanceMetrics` / `MetricCard`                                                               | Metrics display                                                         |        N/A (presentational)        |
| `Info`                                                                                            | Static help text                                                        |        N/A (presentational)        |
| `Error`                                                                                           | Error boundary fallback UI                                              |        N/A (presentational)        |

**Audit result:** every core/IO class that needs the contracts already implements
them, and no React component does (correctly). No contract was added or removed by
this audit.

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

| Address Range | Size | Component  | Description                          |
| ------------- | ---- | ---------- | ------------------------------------ |
| $0000-$0FFF   | 4KB  | RAM Bank 1 | Main RAM (includes zero page, stack) |
| $D010-$D013   | 4B   | PIA 6820   | Keyboard and display I/O             |
| $E000-$EFFF   | 4KB  | RAM Bank 2 | Extended RAM (for BASIC)             |
| $FF00-$FFFF   | 256B | ROM        | WOZ Monitor                          |

## Worker Communication

Communication uses Comlink for type-safe RPC between UI and Worker:

```typescript
// Worker API interface
interface IWorkerAPI {
    // Emulation control
    pauseEmulation(): void;
    resumeEmulation(): void;
    step(): DebugData;

    // Breakpoints
    setBreakpoint(address: number): number[];
    clearBreakpoint(address: number): number[];

    // Memory operations
    readMemoryRange(start: number, length: number): number[];
    writeMemory(address: number, value: number): void;

    // State management
    saveState(): EmulatorState;
    loadState(state: EmulatorState): void;
}

// Usage via WorkerManager
const api = await WorkerManager.getInstance();
const breakpoints = await api.setBreakpoint(0x300);
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
- **WorkerDataContext**: Provides worker data to components

## Performance Considerations

### Web Worker Isolation

- CPU emulation runs in separate thread
- Prevents UI blocking during execution
- Comlink handles serialization/deserialization
- Async/await pattern for worker calls

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

- Vitest test framework (migrated from Jest)
- 626 unit and integration tests
- Custom test utilities for consistency
- Worker test helpers for Comlink mocking

## Recent Architectural Improvements

### Comlink Migration (Completed)

- Replaced manual postMessage/onmessage with Comlink RPC
- Type-safe worker communication with async/await
- Reduced worker communication code by ~50%
- Improved error handling and debugging

### Type System Reorganization (Completed)

- Removed legacy `@types/` directories
- Organized types by module: `core/types/`, `apple1/types/`, etc.
- Centralized type definitions with clean exports
- Better type safety and maintainability

### State Management Standardization (Completed)

- All components implement `IVersionedStatefulComponent`
- Version tracking and migration support
- Comprehensive state validation
- Backward compatibility maintained

### Service Layer Enhancement (Completed)

- Added WorkerManager for lifecycle management
- WorkerDataSync for UI synchronization
- WorkerDataContext for React integration
- Improved separation of concerns

### CPU Module Refactoring (Completed)

- Split monolithic CPU6502.ts (2583 lines) into 6 focused modules
- Improved maintainability and code organization
- Clear separation of concerns: opcodes, addressing, instructions, debug
- All tests passing with modular structure

### Reusable Hooks for Worker State (Completed)

- Created generic `useWorkerState<T>` hook for state synchronization
- Built specialized hooks: `useWorkerDebugInfo`, `useWorkerBreakpoints`
- Reduced code duplication across components
- Type-safe with TypeScript generics

## Future Extensibility

The architecture supports:

- Additional peripherals (cassette, printer)
- Different CPU speeds
- Alternative ROM images
- Custom memory configurations
- Additional debugging tools
