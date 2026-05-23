/**
 * CPU Engine exports
 * 
 * Central export point for all CPU engine implementations
 */

export { JSEngine } from './JSEngine';
export { WasmEngine } from './WasmEngine';
export { WasmSystemEngine } from './WasmSystemEngine';
export { DualEngine } from './DualEngine';
export { 
    initializeWasmModule, 
    isWasmSupported, 
    getWasmStatus,
    resetWasmModule 
} from './wasm-loader';

// Re-export interface types for convenience
export type { 
    ICPUEngine,
    EngineType,
    CPURegisters,
    EngineMetrics,
    EngineSwitchEvent,
    EngineComparison,
    EngineFactory
} from '../cpu-interface/ICPUEngine';