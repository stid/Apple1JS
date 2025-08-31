/**
 * WASM Module Loader
 * 
 * Handles initialization and loading of the WASM CPU module
 * with proper error handling and fallback support.
 */

import init, { CPU6502 as WasmCPU, InitOutput } from '../../wasm/apple1_cpu_wasm';
import { loggingService } from '../../services/LoggingService';

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
        loggingService.info('WasmLoader', 'Initializing WASM CPU module...');
        
        // Initialize the WASM module - init will handle loading the WASM file
        const module = await init();
        
        // Store the module
        moduleState.module = module;
        moduleState.isInitialized = true;
        moduleState.isInitializing = false;
        
        loggingService.info('WasmLoader', 'WASM CPU module initialized successfully');
        
        // Verify the module works by creating a test instance
        try {
            const testCpu = new WasmCPU();
            testCpu.free(); // Clean up test instance
            loggingService.info('WasmLoader', 'WASM CPU verification successful');
        } catch (error) {
            loggingService.error('WasmLoader', `WASM CPU verification failed: ${error}`);
            throw new Error('WASM CPU module verification failed');
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

// Export the WasmCPU type for use in other modules
export { WasmCPU };
export type { InitOutput };