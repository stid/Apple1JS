/**
 * CPU Engine Interface Module
 * 
 * Exports all types and interfaces for the dual-engine CPU system.
 */

export type {
    ICPUEngine,
    EngineType,
    CPURegisters,
    EngineMetrics,
    EngineFactory,
    EngineSwitchEvent,
    EngineComparison
} from './ICPUEngine';

export {
    ExecutionMode,
    MemoryAccessType,
    EngineErrorType,
    EngineEventType,
    EngineError
} from './types';

export type {
    MemoryAccessEvent,
    InstructionEvent,
    EngineConfig,
    InitOptions,
    Breakpoint,
    StackFrame,
    DebugState,
    PerformanceSample,
    BenchmarkResult,
    EngineCapabilities,
    EngineEvent
} from './types';