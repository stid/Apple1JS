/**
 * Dual Engine CPU Coordinator
 * 
 * Manages both JavaScript and WASM CPU engines, enabling runtime switching
 * between them while maintaining state consistency.
 */

import type { 
    ICPUEngine, 
    EngineType, 
    CPURegisters, 
    EngineMetrics,
    EngineSwitchEvent,
    EngineComparison
} from '../cpu-interface/ICPUEngine';
import type { CPU6502State } from '../cpu6502/types';
import type Bus from '../Bus';
import { JSEngine } from './JSEngine';
import { WasmEngine } from './WasmEngine';
import { isWasmSupported } from './wasm-loader';
import { loggingService } from '../../services/LoggingService';

/**
 * Engine switch reason types
 */
type SwitchReason = 'user' | 'performance' | 'error' | 'fallback';

/**
 * Engine switch listener
 */
type EngineSwitchListener = (event: EngineSwitchEvent) => void;

/**
 * Dual engine coordinator that manages both JS and WASM engines
 */
export class DualEngine implements ICPUEngine {
    // Current active engine
    private activeEngine: ICPUEngine;
    private activeEngineType: EngineType;
    
    // Both engine instances
    private jsEngine: JSEngine;
    private wasmEngine: WasmEngine | null = null;
    
    // Event listeners
    private switchListeners: Set<EngineSwitchListener> = new Set();
    
    // Performance tracking
    private switchCount = 0;
    private lastSwitchTime = 0;
    
    // Auto-switch configuration
    private autoSwitchEnabled = false;
    private performanceThreshold = 0.5; // Switch if one engine is 50% faster
    
    constructor(bus: Bus, initialEngine: EngineType = 'JS') {
        // Always create JS engine as fallback
        this.jsEngine = new JSEngine(bus);
        
        // Try to create WASM engine if supported
        if (isWasmSupported()) {
            try {
                this.wasmEngine = new WasmEngine(bus);
            } catch (error) {
                loggingService.warn('DualEngine', `Failed to create WASM engine, using JS only: ${error}`);
            }
        } else {
            loggingService.info('DualEngine', 'WASM not supported, using JS engine only');
        }
        
        // Set initial engine
        if (initialEngine === 'WASM' && this.wasmEngine) {
            this.activeEngine = this.wasmEngine;
            this.activeEngineType = 'WASM';
        } else {
            this.activeEngine = this.jsEngine;
            this.activeEngineType = 'JS';
        }
        
        loggingService.info('DualEngine', `Initialized with ${this.activeEngineType} engine`);
    }
    
    // ============ ICPUEngine Implementation ============
    
    get engineType(): EngineType {
        return this.activeEngineType;
    }
    
    get engineVersion(): string {
        return `Dual-${this.activeEngine.engineVersion}`;
    }
    
    get isReady(): boolean {
        return this.activeEngine.isReady;
    }
    
    get capabilities() {
        return {
            ...this.activeEngine.capabilities!,
            supportsEngineSwitch: true,
            availableEngines: this.getAvailableEngines()
        };
    }
    
    async initialize(): Promise<void> {
        // Initialize both engines in parallel if possible
        const promises: Promise<void>[] = [];
        
        // JS engine doesn't need initialization
        promises.push(this.jsEngine.ensureReady());
        
        if (this.wasmEngine?.initialize) {
            promises.push(
                this.wasmEngine.initialize().catch(error => {
                    loggingService.error('DualEngine', `WASM initialization failed: ${error}`);
                    // Don't throw, just disable WASM
                    this.wasmEngine = null;
                })
            );
        }
        
        await Promise.all(promises);
    }
    
    async ensureReady(): Promise<void> {
        await this.activeEngine.ensureReady();
    }
    
    // ============ Core Operations (Delegated) ============
    
    performSingleStep(): number {
        return this.activeEngine.performSingleStep();
    }
    
    performBulkSteps(cycles: number): void {
        // Simply delegate to active engine
        this.activeEngine.performBulkSteps(cycles);
    }
    
    reset(): void {
        // Reset both engines to keep them in sync
        this.jsEngine.reset();
        this.wasmEngine?.reset();
    }
    
    halt(): void {
        this.activeEngine.halt();
    }
    
    // ============ State Management ============
    
    saveState(): CPU6502State {
        return this.activeEngine.saveState();
    }
    
    loadState(state: CPU6502State): void {
        // Load state into both engines to keep them synchronized
        this.jsEngine.loadState(state);
        
        if (this.wasmEngine?.isReady) {
            try {
                this.wasmEngine.loadState(state);
            } catch (error) {
                loggingService.warn('DualEngine', `Failed to load state into WASM engine: ${error}`);
            }
        }
    }
    
    getRegisters(): CPURegisters {
        return this.activeEngine.getRegisters();
    }
    
    setRegisters(registers: Partial<CPURegisters>): void {
        // Set registers in both engines
        this.jsEngine.setRegisters(registers);
        this.wasmEngine?.setRegisters(registers);
    }
    
    // ============ Memory Operations ============

    read(address: number): number {
        return this.activeEngine.read(address);
    }

    write(address: number, value: number): void {
        // With unified memory, only write to active engine
        // Both engines share the same memory!
        this.activeEngine.write(address, value);
    }

    readRange(start: number, length: number): Uint8Array {
        return this.activeEngine.readRange(start, length);
    }

    writeRange(start: number, data: Uint8Array): void {
        // With unified memory, only write to active engine
        this.activeEngine.writeRange(start, data);
    }

    loadProgram(program: Uint8Array, address?: number): void {
        // With unified memory, only load to active engine
        this.activeEngine.loadProgram(program, address);
    }
    
    // ============ Debugging Support ============
    
    setBreakpoint(address: number): void {
        this.jsEngine.setBreakpoint(address);
        this.wasmEngine?.setBreakpoint(address);
    }
    
    clearBreakpoint(address: number): void {
        this.jsEngine.clearBreakpoint(address);
        this.wasmEngine?.clearBreakpoint(address);
    }
    
    clearAllBreakpoints(): void {
        this.jsEngine.clearAllBreakpoints();
        this.wasmEngine?.clearAllBreakpoints();
    }
    
    getBreakpoints(): number[] {
        return this.activeEngine.getBreakpoints();
    }
    
    hasBreakpoint(address: number): boolean {
        return this.activeEngine.hasBreakpoint(address);
    }
    
    // ============ Performance & Metrics ============
    
    getMetrics(): EngineMetrics {
        // Get fresh metrics from the active engine
        const metrics = this.activeEngine.getMetrics();
        
        // Ensure metrics are properly populated
        return {
            totalCycles: metrics.totalCycles || 0,
            instructionsExecuted: metrics.instructionsExecuted || 0,
            averageIPS: metrics.averageIPS || 0,
            memoryUsage: metrics.memoryUsage || 0,
            lastStepDuration: metrics.lastStepDuration || 0,
            initializationTime: metrics.initializationTime || 0,
            efficiency: metrics.efficiency || 100
        };
    }
    
    /**
     * Get metrics from individual engines for performance monitoring
     */
    getEngineMetrics(): { js: EngineMetrics | null; wasm: EngineMetrics | null } {
        return {
            js: this.jsEngine.getMetrics(),
            wasm: this.wasmEngine?.getMetrics() || null
        };
    }
    
    resetMetrics(): void {
        this.jsEngine.resetMetrics();
        this.wasmEngine?.resetMetrics();
    }
    
    getMemoryUsage(): number {
        // Return combined memory usage
        let total = this.jsEngine.getMemoryUsage();
        if (this.wasmEngine?.isReady) {
            total += this.wasmEngine.getMemoryUsage();
        }
        return total;
    }
    
    // ============ Engine Switching ============
    
    /**
     * Switch to a different engine
     */
    async switchEngine(targetEngine: EngineType, reason: SwitchReason = 'user'): Promise<void> {
        if (targetEngine === this.activeEngineType) {
            loggingService.info('DualEngine', `Already using ${targetEngine} engine`);
            return;
        }
        
        // Check if target engine is available
        if (targetEngine === 'WASM' && !this.wasmEngine) {
            throw new Error('WASM engine is not available');
        }
        
        const startTime = Date.now();
        const fromEngine = this.activeEngineType;
        const fromMetrics = this.activeEngine.getMetrics();
        
        loggingService.info('DualEngine', `Switching from ${fromEngine} to ${targetEngine} engine (reason: ${reason})`);
        
        try {
            // Save current state
            const currentState = this.activeEngine.saveState();
            
            // Get target engine
            const newEngine = targetEngine === 'JS' ? this.jsEngine : this.wasmEngine!;
            
            // Ensure target engine is ready
            await newEngine.ensureReady();
            
            // Load state into target engine
            newEngine.loadState(currentState);
            
            // Switch active engine
            this.activeEngine = newEngine;
            this.activeEngineType = targetEngine;
            
            // Update metrics
            this.switchCount++;
            this.lastSwitchTime = Date.now() - startTime;
            
            // Emit switch event
            const event: EngineSwitchEvent = {
                from: fromEngine,
                to: targetEngine,
                timestamp: Date.now(),
                reason,
                metrics: {
                    fromMetrics,
                    toMetrics: newEngine.getMetrics()
                }
            };
            
            this.emitSwitchEvent(event);
            
            loggingService.info('DualEngine', 
                `Engine switch completed in ${this.lastSwitchTime.toFixed(2)}ms`);
            
        } catch (error) {
            loggingService.error('DualEngine', `Failed to switch to ${targetEngine} engine: ${error}`);
            
            // Try to fallback to JS if switching to WASM failed
            if (targetEngine === 'WASM' && fromEngine === 'JS') {
                this.activeEngine = this.jsEngine;
                this.activeEngineType = 'JS';
                
                const event: EngineSwitchEvent = {
                    from: fromEngine,
                    to: 'JS',
                    timestamp: Date.now(),
                    reason: 'fallback'
                };
                
                this.emitSwitchEvent(event);
            }
            
            throw error;
        }
    }
    
    /**
     * Get list of available engines
     */
    getAvailableEngines(): EngineType[] {
        const engines: EngineType[] = ['JS'];
        if (this.wasmEngine) {
            engines.push('WASM');
        }
        return engines;
    }
    
    /**
     * Check if an engine is available
     */
    isEngineAvailable(engine: EngineType): boolean {
        return engine === 'JS' || (engine === 'WASM' && this.wasmEngine !== null);
    }
    
    /**
     * Compare performance of both engines
     */
    async compareEngines(): Promise<EngineComparison> {
        if (!this.wasmEngine) {
            throw new Error('WASM engine not available for comparison');
        }
        
        // Ensure both engines are ready
        await this.jsEngine.ensureReady();
        await this.wasmEngine.ensureReady();
        
        // Get metrics from both
        const jsMetrics = this.jsEngine.getMetrics();
        const wasmMetrics = this.wasmEngine.getMetrics();
        
        // Calculate speedup
        const speedup = wasmMetrics.averageIPS / (jsMetrics.averageIPS || 1);
        
        // Calculate memory ratio
        const jsMemory = this.jsEngine.getMemoryUsage();
        const wasmMemory = this.wasmEngine.getMemoryUsage();
        const memoryRatio = wasmMemory / jsMemory;
        
        // Make recommendation
        let recommendation: 'JS' | 'WASM' = 'JS';
        let reason = 'JS engine is more stable';
        
        if (speedup > 1.5 && wasmMetrics.instructionsExecuted > 1000) {
            recommendation = 'WASM';
            reason = `WASM is ${speedup.toFixed(1)}x faster`;
        } else if (memoryRatio < 0.7 && wasmMetrics.instructionsExecuted > 1000) {
            recommendation = 'WASM';
            reason = `WASM uses ${((1 - memoryRatio) * 100).toFixed(0)}% less memory`;
        }
        
        return {
            js: jsMetrics,
            wasm: wasmMetrics,
            speedup,
            memoryRatio,
            recommendation,
            reason
        };
    }
    
    /**
     * Enable/disable automatic engine switching based on performance
     */
    setAutoSwitch(enabled: boolean, threshold = 0.5): void {
        this.autoSwitchEnabled = enabled;
        this.performanceThreshold = threshold;
        
        if (enabled) {
            loggingService.info('DualEngine', 
                `Auto-switch enabled with ${this.performanceThreshold * 100}% performance threshold`);
        }
    }
    
    /**
     * Get engine switch statistics
     */
    getSwitchStats(): {
        currentEngine: EngineType;
        availableEngines: EngineType[];
        switchCount: number;
        lastSwitchTime: number;
        autoSwitchEnabled: boolean;
    } {
        return {
            currentEngine: this.activeEngineType,
            availableEngines: this.getAvailableEngines(),
            switchCount: this.switchCount,
            lastSwitchTime: this.lastSwitchTime,
            autoSwitchEnabled: this.autoSwitchEnabled
        };
    }
    
    // ============ Event Management ============
    
    /**
     * Add engine switch event listener
     */
    onEngineSwitch(listener: EngineSwitchListener): () => void {
        this.switchListeners.add(listener);
        
        // Return unsubscribe function
        return () => {
            this.switchListeners.delete(listener);
        };
    }
    
    private emitSwitchEvent(event: EngineSwitchEvent): void {
        this.switchListeners.forEach(listener => {
            try {
                listener(event);
            } catch (error) {
                loggingService.error('DualEngine', `Error in switch event listener: ${error}`);
            }
        });
    }
    
    // ============ Engine-Specific Features ============
    
    getDebugInfo(): unknown {
        return {
            activeEngine: this.activeEngineType,
            availableEngines: this.getAvailableEngines(),
            switchStats: this.getSwitchStats(),
            jsDebugInfo: this.jsEngine.getDebugInfo ? this.jsEngine.getDebugInfo() : null,
            wasmDebugInfo: this.wasmEngine?.getDebugInfo ? this.wasmEngine.getDebugInfo() : null
        };
    }
    
    cleanup(): void {
        // Clean up both engines
        this.jsEngine.cleanup?.();
        this.wasmEngine?.cleanup?.();
        
        // Clear listeners
        this.switchListeners.clear();
    }
    
    /**
     * Get the internal JS CPU for compatibility with execution hooks
     * This is needed for breakpoint functionality in WorkerState
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public getInternalCPU(): any {
        // Access the private cpu property of JSEngine
        // This is a workaround for breakpoint support
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (this.jsEngine as any).cpu;
    }

}