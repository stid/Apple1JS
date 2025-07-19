import Apple1 from '.';
import WebWorkerKeyboard from './WebKeyboard';
import WebCRTVideo from './WebCRTVideo';
import type { IWorkerState } from './types/worker-api';
import { loggingService } from '../services/LoggingService';
import { Formatters } from '../utils/formatters';

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
        this.apple1 = new Apple1({ 
            video: this.video, 
            keyboard: this.keyboard 
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
        
        // Set up logging handler
        this.setupLoggingHandler();
        
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
     * Set up logging service handler
     */
    private setupLoggingHandler(): void {
        // Logging is now handled through WorkerAPI
        // Keep this method for compatibility
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
    public startEmulation(): void {
        this.apple1.startLoop();
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
}