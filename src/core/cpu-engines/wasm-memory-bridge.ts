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
    }
};

/**
 * Set the Bus instance for WASM to use
 */
export function setBusForWasm(bus: Bus): void {
    currentBus = bus;
    loggingService.info('WasmMemoryBridge', 'Bus instance set for WASM memory access');
}

/**
 * Install the memory bridge on the global object for WASM to access
 */
export function installMemoryBridge(): void {
    // Check if we're in a Worker context or main thread
    const globalObj = typeof globalThis !== 'undefined' ? globalThis : 
                     // eslint-disable-next-line no-undef
                     typeof self !== 'undefined' ? self : 
                     // eslint-disable-next-line @typescript-eslint/no-explicit-any
                     typeof window !== 'undefined' ? window : {} as any;
    
    // Make the bridge available globally for WASM to call
    globalObj.wasmMemoryBridge = wasmMemoryBridge;
    loggingService.info('WasmMemoryBridge', 'Memory bridge installed on global object');
}

/**
 * Check if memory bridge is properly installed
 */
export function isMemoryBridgeReady(): boolean {
    const globalObj = typeof globalThis !== 'undefined' ? globalThis : 
                     // eslint-disable-next-line no-undef
                     typeof self !== 'undefined' ? self : 
                     // eslint-disable-next-line @typescript-eslint/no-explicit-any
                     typeof window !== 'undefined' ? window : {} as any;
    
    return currentBus !== null && globalObj.wasmMemoryBridge === wasmMemoryBridge;
}