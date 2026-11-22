/**
 * Data shapes exchanged with the emulator worker (through Comlink).
 */

// Interface for DebugData: a dictionary of debugging information
export interface DebugData {
    [key: string]: { [key: string]: string | number | object };
}

// CPU Debug data structure
export interface CPUDebugData {
    [key: string]: string | number | object;
    _PERF_DATA?: CPUPerfData;
}

// Component debug data structure
export interface ComponentDebugData {
    [key: string]: string | number | object;
}

// Filtered debug data that supports string, number, and nested object values
// This properly supports special objects like _PERF_DATA without workarounds
export interface FilteredDebugData {
    cpu: CPUDebugData;
    pia: ComponentDebugData;
    Bus: ComponentDebugData;
    clock: ComponentDebugData;
}

// Type for CPU performance data
export interface CPUPerfStats {
    instructionCount: number;
    totalInstructions: number;
    profilingEnabled: boolean;
}

export interface CPUPerfOpcode {
    opcode: string;
    count: number;
    cycles: number;
    avgCycles: number;
}

export interface CPUPerfData {
    stats?: CPUPerfStats;
    topOpcodes?: CPUPerfOpcode[];
}

// Interface for memory map region
export interface MemoryRegion {
    start: number;
    end: number;
    type: 'RAM' | 'ROM' | 'IO' | 'UNMAPPED';
    writable: boolean;
    description?: string;
}

// Interface for memory map data
export interface MemoryMapData {
    regions: MemoryRegion[];
}

// Interface for engine status
// Note: Only the currently active engine's metrics will be populated
export interface EngineStatusData {
    currentEngine: 'JS' | 'WASM';
    availableEngines: ('JS' | 'WASM')[];
    switchCount: number;
    lastSwitchTime: number;
    jsMetrics?: EngineMetricsData; // Populated only when currentEngine === 'JS'
    wasmMetrics?: EngineMetricsData; // Populated only when currentEngine === 'WASM'
}

// Interface for engine metrics
export interface EngineMetricsData {
    instructionsExecuted: number;
    averageIPS: number;
    lastIPS: number;
    cyclesExecuted: number;
    memoryUsage: number;
    /**
     * Host wall-clock ms spent executing per emulated second (1MHz target).
     * Lower is faster; this is what exposes WASM's real advantage that the
     * clock-throttled IPS hides. 0 until enough work has run to measure.
     */
    hostMillisPerSecond: number;
}

// Interface for engine comparison
export interface EngineComparisonData {
    js: EngineMetricsData;
    wasm: EngineMetricsData;
    speedup: number;
    memoryRatio: number;
    recommendation: 'JS' | 'WASM';
    reason: string;
}

/**
 * Clock data interface (replacing unknown)
 */
export interface ClockData {
    cycles: number;
    frequency: number;
    totalCycles: number;
}
