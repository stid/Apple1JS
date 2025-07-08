/**
 * Core emulation type definitions
 * 
 * This module exports all type definitions used by the core emulation system.
 * These types are independent of any specific computer implementation.
 */

// Bus and memory-mapped I/O types
export type {
    IoAddressable,
    BusSpaceType,
    BusComponentMetadata,
    WithBusMetadata
} from './bus';

// CPU 6502 types
export type {
    CPU6502State,
    DisassemblyLine,
    TraceEntry,
    CPU6502DebugExtensions,
    CPU6502WithDebug
} from './cpu';

// Clock and timing types
export type {
    IClockable,
    TimingStats
} from './clock';

// Component inspection types
export type {
    InspectableBase,
    InspectableAddress,
    InspectableStats,
    InspectableChild,
    InspectableData,
    IInspectableComponent,
    ArchViewNode,
    ArchitectureView
} from './components';

// I/O component types
export type {
    WireOptions,
    IoLogicBase,
    IoWriter,
    IoLogic,
    IoComponentState,
    IoComponent
} from './io';

// Event system types
export type {
    subscribeFunction,
    PubSub
} from './pubsub';

// State management types
export type {
    StateBase,
    StateValidationResult,
    StateOptions,
    IStatefulComponent,
    IVersionedStatefulComponent,
    ICompositeStatefulComponent
} from './state';

export {
    StateManager,
    StateError,
    withStateDirtyTracking,
    dirtyOnCall
} from './state';
