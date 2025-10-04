import Apple1 from '.';
import WebWorkerKeyboard from './WebKeyboard';
import WebCRTVideo from './WebCRTVideo';
import type { IWorkerState } from './types/worker-api';
import { loggingService } from '../services/LoggingService';
import { Formatters } from '../utils/formatters';
import type { DualEngine } from '../core/cpu-engines';
import type { EngineStatusData, EngineComparisonData, EngineMetricsData } from './types/worker-messages';

/**
 * WorkerState encapsulates all the state that was previously at module level.
 * This refactoring is necessary for the Comlink migration to avoid module-level
 * side effects and make the worker more testable.
 */
export class WorkerState implements IWorkerState {
    // Core components
    public readonly video: WebCRTVideo;
    public readonly keyboard: WebWorkerKeyboard;
    public readonly apple1: Apple1;
    
    // Breakpoint management
    public readonly breakpoints: Set<number>;
    public runToCursorTarget: number | null;
    
    // Emulation state
    public isPaused: boolean;
    public isStepping: boolean;
    
    // Debugger state
    public debuggerActive: boolean;
    public debugUpdateInterval: number | null;
    
    // Callbacks for events
    private statusCallback?: (status: 'running' | 'paused') => void;
    private breakpointCallback?: (address: number) => void;
    
    constructor() {
        // Initialize video and keyboard
        this.video = new WebCRTVideo();
        this.keyboard = new WebWorkerKeyboard();
        
        // Create Apple1 instance with video and keyboard
        // Enable DualEngine for runtime CPU switching
        this.apple1 = new Apple1({ 
            video: this.video, 
            keyboard: this.keyboard,
            useDualEngine: true  // Enable dual-engine CPU
        });
        
        // Initialize state
        this.breakpoints = new Set<number>();
        this.runToCursorTarget = null;
        this.isPaused = false;
        this.isStepping = false;
        this.debuggerActive = false;
        this.debugUpdateInterval = null;
        
        // Set up video subscription
        this.setupVideoSubscription();

        // Initialize breakpoint hook
        this.updateBreakpointHook();
    }
    
    /**
     * Set up video update subscription
     */
    private setupVideoSubscription(): void {
        // Video updates are handled directly in WorkerAPI
        // This is kept for compatibility
    }
    
    /**
     * Update the CPU execution hook for breakpoint checking
     */
    public updateBreakpointHook(): void {
        if (this.breakpoints.size === 0) {
            // No breakpoints - remove hook for performance
            this.apple1.cpu.setExecutionHook(undefined);
        } else {
            // Install hook to check breakpoints before each instruction
            this.apple1.cpu.setExecutionHook((pc: number) => {
                // Skip breakpoint check if we're stepping (to allow stepping over breakpoints)
                if (this.isStepping) {
                    return true;
                }
                
                // Only check breakpoints when running (not already paused)
                if (!this.isPaused && this.breakpoints.has(pc)) {
                    // Hit a breakpoint - pause execution
                    this.apple1.clock.pause();
                    this.isPaused = true;
                    // Use callbacks if available
                    if (this.statusCallback) {
                        this.statusCallback('paused');
                    }
                    if (this.breakpointCallback) {
                        this.breakpointCallback(pc);
                    }
                    loggingService.log('info', 'Breakpoint', 
                        `Hit breakpoint at ${Formatters.address(pc)}`);
                    return false; // Halt execution
                }
                return true; // Continue execution
            });
        }
    }
    
    /**
     * Set callbacks for events
     */
    public setCallbacks(callbacks: {
        onStatus?: (status: 'running' | 'paused') => void;
        onBreakpoint?: (address: number) => void;
    }): void {
        if (callbacks.onStatus) this.statusCallback = callbacks.onStatus;
        if (callbacks.onBreakpoint) this.breakpointCallback = callbacks.onBreakpoint;
    }
    
    /**
     * Update debugger state and manage debug update interval
     */
    public updateDebuggerState(active: boolean): void {
        this.debuggerActive = active;
        
        if (active && !this.debugUpdateInterval) {
            // Debug updates are now handled by polling from main thread
            // Keep interval for compatibility but don't send postMessage
            this.debugUpdateInterval = 1; // Just a placeholder
        } else if (!active && this.debugUpdateInterval) {
            // Stop sending debug updates
            clearInterval(this.debugUpdateInterval);
            this.debugUpdateInterval = null;
        }
    }
    
    /**
     * Start the emulation loop
     */
    public async startEmulation(): Promise<void> {
        // The Apple1.startLoop() method now handles engine initialization
        await this.apple1.startLoop();
        this.isPaused = false;
    }
    
    /**
     * Clean up resources
     */
    public cleanup(): void {
        if (this.debugUpdateInterval) {
            clearInterval(this.debugUpdateInterval);
            this.debugUpdateInterval = null;
        }
    }
    
    /**
     * Get the dual-engine CPU if available
     */
    public getDualEngine(): DualEngine | null {
        return this.apple1.cpuEngine as DualEngine || null;
    }
    
    /**
     * Switch between JS and WASM engines
     */
    public async switchEngine(targetEngine: 'JS' | 'WASM'): Promise<void> {
        const dualEngine = this.getDualEngine();
        if (!dualEngine) {
            throw new Error('Dual-engine CPU not available');
        }
        
        await dualEngine.switchEngine(targetEngine);
        loggingService.info('WorkerState', `Switched to ${targetEngine} engine`);
    }
    
    /**
     * Get current engine status
     */
    public getEngineStatus(): EngineStatusData {
        const dualEngine = this.getDualEngine();
        if (!dualEngine) {
            // Return default status for non-dual-engine setups
            return {
                currentEngine: 'JS',
                availableEngines: ['JS'],
                switchCount: 0,
                lastSwitchTime: 0,
                autoSwitchEnabled: false
            };
        }
        
        const stats = dualEngine.getSwitchStats();
        const engineMetrics = dualEngine.getEngineMetrics();
        const jsMetrics = engineMetrics.js ? this.convertEngineMetrics(engineMetrics.js) : undefined;
        const wasmMetrics = engineMetrics.wasm ? this.convertEngineMetrics(engineMetrics.wasm) : undefined;
        
        const result: EngineStatusData = {
            currentEngine: stats.currentEngine,
            availableEngines: stats.availableEngines,
            switchCount: stats.switchCount,
            lastSwitchTime: stats.lastSwitchTime,
            autoSwitchEnabled: stats.autoSwitchEnabled
        };
        
        if (jsMetrics) {
            result.jsMetrics = jsMetrics;
        }
        
        if (wasmMetrics) {
            result.wasmMetrics = wasmMetrics;
        }
        
        return result;
    }
    
    /**
     * Compare engine performance
     */
    public async compareEngines(): Promise<EngineComparisonData> {
        const dualEngine = this.getDualEngine();
        if (!dualEngine) {
            throw new Error('Dual-engine CPU not available');
        }
        
        const comparison = await dualEngine.compareEngines();
        
        return {
            js: this.convertEngineMetrics(comparison.js),
            wasm: this.convertEngineMetrics(comparison.wasm),
            speedup: comparison.speedup,
            memoryRatio: comparison.memoryRatio,
            recommendation: comparison.recommendation,
            reason: comparison.reason
        };
    }
    
    /**
     * Set auto-switch configuration
     */
    public setAutoSwitch(enabled: boolean, threshold?: number): void {
        const dualEngine = this.getDualEngine();
        if (dualEngine) {
            dualEngine.setAutoSwitch(enabled, threshold);
        }
    }
    
    /**
     * Convert internal engine metrics to API format
     */
    private convertEngineMetrics(metrics: unknown): EngineMetricsData {
        const metricsObj = metrics as Record<string, unknown> | undefined;
        const avgIPS = (metricsObj?.averageIPS as number) || 0;
        const lastIPS = (metricsObj?.lastIPS as number) || avgIPS; // Use lastIPS if available, fallback to average
        return {
            instructionsExecuted: (metricsObj?.instructionsExecuted as number) || 0,
            averageIPS: avgIPS,
            lastIPS: lastIPS,
            cyclesExecuted: (metricsObj?.totalCycles as number) || 0,
            memoryUsage: (metricsObj?.memoryUsage as number) || 0
        };
    }
}