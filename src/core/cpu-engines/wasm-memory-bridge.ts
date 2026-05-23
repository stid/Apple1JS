/**
 * WASM Memory Bridge
 *
 * Provides memory access functions for WASM CPU to use JavaScript Bus
 * as the single source of truth for all memory operations.
 *
 * This eliminates the dual-memory problem by having WASM call back
 * to JavaScript for every memory access.
 */

import type Bus from '../Bus';
import { loggingService } from '../../services/LoggingService';

// Global reference to the current Bus instance
let currentBus: Bus | null = null;

/**
 * Memory bridge interface that WASM will call
 */
export const wasmMemoryBridge = {
    /**
     * Read a byte from the Bus
     * Called by WASM for every memory read
     */
    readByte(address: number): number {
        if (!currentBus) {
            loggingService.error('WasmMemoryBridge', 'No Bus instance set');
            return 0;
        }
        return currentBus.read(address);
    },

    /**
     * Write a byte to the Bus
     * Called by WASM for every memory write
     */
    writeByte(address: number, value: number): void {
        if (!currentBus) {
            loggingService.error('WasmMemoryBridge', 'No Bus instance set');
            return;
        }

        currentBus.write(address, value);
    },
};

/**
 * Set the Bus instance for WASM to use
 */
export function setBusForWasm(bus: Bus): void {
    currentBus = bus;
    loggingService.info('WasmMemoryBridge', 'Bus instance set for WASM memory access');
}

/** Global scope augmented with the bridge property WASM looks up by bare identifier. */
type GlobalWithBridge = { wasmMemoryBridge?: typeof wasmMemoryBridge };

/**
 * Resolve the global object across main-thread and Web Worker contexts.
 */
function getGlobalScope(): GlobalWithBridge {
    if (typeof globalThis !== 'undefined') return globalThis as unknown as GlobalWithBridge;
    if (typeof self !== 'undefined') return self as unknown as GlobalWithBridge;
    if (typeof window !== 'undefined') return window as unknown as GlobalWithBridge;
    return {};
}

/**
 * Install the memory bridge on the global object for WASM to access
 *
 * IMPORTANT: The wasm-bindgen generated code references `wasmMemoryBridge` as a
 * bare identifier (not via globalThis). In ES modules within Web Workers, we need
 * to ensure it's accessible both ways.
 */
export function installMemoryBridge(): void {
    const globalObj = getGlobalScope();
    globalObj.wasmMemoryBridge = wasmMemoryBridge;

    // Also set on self for Worker compatibility (some bundlers may not resolve globalThis properly)
    if (typeof self !== 'undefined' && (self as unknown) !== globalObj) {
        (self as unknown as GlobalWithBridge).wasmMemoryBridge = wasmMemoryBridge;
    }

    loggingService.info('WasmMemoryBridge', 'Memory bridge installed on global object');
}

/**
 * Check if memory bridge is properly installed
 */
export function isMemoryBridgeReady(): boolean {
    return currentBus !== null && getGlobalScope().wasmMemoryBridge === wasmMemoryBridge;
}
