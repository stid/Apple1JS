/**
 * WASM Module Loader
 * 
 * Handles initialization and loading of the WASM CPU module
 * with proper error handling and fallback support.
 */

import { loggingService } from '../../services/LoggingService';

// Dynamic import types - will use actual module if available, stub types otherwise
type WasmModule = typeof import('../../wasm/apple1_cpu_wasm');
type InitOutput = import('../../wasm/apple1_cpu_wasm').InitOutput;
type WasmCPU = import('../../wasm/apple1_cpu_wasm').CPU6502;
type WasmSystem = import('../../wasm/apple1_cpu_wasm').WasmSystem;

// Module references - loaded dynamically
let wasmModule: WasmModule | null = null;
let initFunction: WasmModule['default'] | null = null;
let WasmCPUClass: typeof import('../../wasm/apple1_cpu_wasm').CPU6502 | null = null;
let WasmSystemClass: typeof import('../../wasm/apple1_cpu_wasm').WasmSystem | null = null;

/**
 * WASM module initialization state
 */
interface WasmModuleState {
    isInitialized: boolean;
    isInitializing: boolean;
    initError?: Error;
    module?: InitOutput;
}

// Module state singleton
const moduleState: WasmModuleState = {
    isInitialized: false,
    isInitializing: false
};

/**
 * Attempt to load the WASM module dynamically
 */
async function loadWasmModule(): Promise<boolean> {
    try {
        // Try to dynamically import the actual WASM module
        wasmModule = await import('../../wasm/apple1_cpu_wasm');
        initFunction = wasmModule.default;
        WasmCPUClass = wasmModule.CPU6502;
        WasmSystemClass = wasmModule.WasmSystem;
        return true;
    } catch {
        loggingService.warn('WasmLoader',
            'WASM module not available - this is expected if WASM has not been built yet');
        return false;
    }
}

/**
 * Initialize the WASM module
 * 
 * This function is idempotent - multiple calls will return the same promise
 * if initialization is already in progress or completed.
 */
export async function initializeWasmModule(): Promise<InitOutput> {
    // If already initialized, return the module
    if (moduleState.isInitialized && moduleState.module) {
        return moduleState.module;
    }
    
    // If initialization failed before, throw the error
    if (moduleState.initError) {
        throw moduleState.initError;
    }
    
    // If already initializing, wait for it
    if (moduleState.isInitializing) {
        return waitForInitialization();
    }
    
    // Start initialization
    moduleState.isInitializing = true;
    
    try {
        // First, try to load the WASM module
        const moduleLoaded = await loadWasmModule();
        
        if (!moduleLoaded || !initFunction || !WasmCPUClass) {
            throw new Error('WASM module not available - please build the WASM module first');
        }
        
        loggingService.info('WasmLoader', 'Initializing WASM CPU module...');
        
        // Initialize the WASM module - init will handle loading the WASM file
        const module = await initFunction();
        
        // Store the module
        moduleState.module = module;
        moduleState.isInitialized = true;
        moduleState.isInitializing = false;
        
        loggingService.info('WasmLoader', 'WASM CPU module initialized successfully');
        
        // Verify the module works by creating test instances
        try {
            const testCpu = new WasmCPUClass();
            testCpu.free(); // Clean up test instance
            loggingService.info('WasmLoader', 'WASM CPU verification successful');

            // Verify WasmSystem if available
            if (WasmSystemClass) {
                const testSystem = new WasmSystemClass();
                testSystem.free(); // Clean up test instance
                loggingService.info('WasmLoader', 'WASM System verification successful');
            }
        } catch (error) {
            loggingService.error('WasmLoader', `WASM module verification failed: ${error}`);
            throw new Error('WASM module verification failed');
        }
        
        return module;
    } catch (error) {
        moduleState.isInitializing = false;
        moduleState.initError = error instanceof Error ? error : new Error(String(error));
        
        loggingService.error('WasmLoader', `Failed to initialize WASM module: ${error}`);
        throw moduleState.initError;
    }
}

/**
 * Wait for ongoing initialization to complete
 */
async function waitForInitialization(): Promise<InitOutput> {
    const maxWaitTime = 10000; // 10 seconds
    const checkInterval = 100; // Check every 100ms
    const startTime = Date.now();
    
    while (moduleState.isInitializing) {
        if (Date.now() - startTime > maxWaitTime) {
            throw new Error('WASM initialization timeout');
        }
        
        await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    if (moduleState.initError) {
        throw moduleState.initError;
    }
    
    if (!moduleState.module) {
        throw new Error('WASM module not available after initialization');
    }
    
    return moduleState.module;
}

/**
 * Check if WASM is supported in the current environment
 */
export function isWasmSupported(): boolean {
    try {
        // Check for WebAssembly support
        if (typeof WebAssembly === 'undefined') {
            return false;
        }
        
        // Check for required WebAssembly features
        if (!WebAssembly.instantiate || !WebAssembly.Module) {
            return false;
        }
        
        // Try to compile a minimal WASM module
        const testWasm = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);
        new WebAssembly.Module(testWasm);
        
        return true;
    } catch {
        return false;
    }
}

/**
 * Get initialization status
 */
export function getWasmStatus(): {
    isSupported: boolean;
    isInitialized: boolean;
    isInitializing: boolean;
    hasError: boolean;
    errorMessage?: string;
} {
    return {
        isSupported: isWasmSupported(),
        isInitialized: moduleState.isInitialized,
        isInitializing: moduleState.isInitializing,
        hasError: !!moduleState.initError,
        ...(moduleState.initError && { errorMessage: moduleState.initError.message })
    };
}

/**
 * Reset the module state (mainly for testing)
 */
export function resetWasmModule(): void {
    moduleState.isInitialized = false;
    moduleState.isInitializing = false;
    delete moduleState.initError;
    delete moduleState.module;
}

/**
 * Get the WasmCPU class after module is loaded
 */
export function getWasmCPUClass(): typeof import('../../wasm/apple1_cpu_wasm').CPU6502 | null {
    return WasmCPUClass;
}

/**
 * Get the WasmSystem class after module is loaded
 */
export function getWasmSystemClass(): typeof import('../../wasm/apple1_cpu_wasm').WasmSystem | null {
    return WasmSystemClass;
}

// Export types for use in other modules
export type { WasmCPU, WasmSystem, InitOutput };