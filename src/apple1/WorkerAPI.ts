import { WorkerState } from './WorkerState';
import type { IWorkerAPI } from './types/worker-api';
import type { EmulatorState } from './types/emulator-state';
import type { VideoData } from './types/video';
import type { 
    DebugData, 
    MemoryMapData, 
    LogMessageData, 
    WORKER_MESSAGES,
    ClockData
} from './types/worker-messages';
import { loggingService } from '../services/LoggingService';
import { Formatters } from '../utils/formatters';

// Declare postMessage for worker context
declare function postMessage(message: unknown, transfer?: Transferable[]): void;

/**
 * WorkerAPI implements the IWorkerAPI interface and provides
 * all the methods that will be exposed through Comlink.
 * This replaces the large switch statement with a cleaner API.
 */
export class WorkerAPI implements IWorkerAPI {
    constructor(private workerState: WorkerState) {}
    
    /**
     * Filter debug data to only include string and number values for backward compatibility
     */
    private filterDebugData(data: Record<string, unknown>): Record<string, string | number> {
        const filtered: Record<string, string | number> = {};
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'string' || typeof value === 'number') {
                filtered[key] = value;
            }
        }
        return filtered;
    }
    
    // ========== Emulation Control ==========
    
    pauseEmulation(): void {
        this.workerState.apple1.clock.pause();
        this.workerState.isPaused = true;
        
        // Update debug interval if debugger is active
        if (this.workerState.debuggerActive) {
            this.workerState.updateDebuggerState(true);
        }
        
        // Send status update
        postMessage({ 
            data: { paused: true }, 
            type: 'EMULATION_STATUS' as unknown as WORKER_MESSAGES
        });
    }
    
    resumeEmulation(): void {
        this.workerState.apple1.clock.resume();
        this.workerState.isPaused = false;
        
        // Update debug interval if debugger is active
        if (this.workerState.debuggerActive) {
            this.workerState.updateDebuggerState(true);
        }
        
        // Send status update
        postMessage({ 
            data: { paused: false }, 
            type: 'EMULATION_STATUS' as unknown as WORKER_MESSAGES
        });
    }
    
    step(): DebugData {
        // First pause the clock to prevent concurrent execution
        this.workerState.apple1.clock.pause();
        this.workerState.isPaused = true;
        
        // Set stepping flag to bypass breakpoint check for this instruction
        this.workerState.isStepping = true;
        
        // Execute one instruction
        this.workerState.apple1.cpu.performSingleStep();
        
        // Clear stepping flag
        this.workerState.isStepping = false;
        
        // Check if we hit a breakpoint after stepping (at the new PC)
        if (this.workerState.breakpoints.has(this.workerState.apple1.cpu.PC)) {
            postMessage({
                data: this.workerState.apple1.cpu.PC,
                type: 'BREAKPOINT_HIT' as unknown as WORKER_MESSAGES
            });
        }
        
        // Return debug info, filtering out boolean and object values for backward compatibility
        const { cpu, pia, bus, clock } = this.workerState.apple1;
        return {
            cpu: this.filterDebugData(cpu.toDebug()),
            pia: this.filterDebugData(pia.toDebug()),
            Bus: this.filterDebugData(bus.toDebug()),
            clock: this.filterDebugData(clock.toDebug()),
        };
    }
    
    saveState(): EmulatorState {
        // Use the deprecated method for now to maintain compatibility
        return this.workerState.apple1.saveEmulatorState();
    }
    
    loadState(state: EmulatorState): void {
        // Deep clone the state to ensure a new reference
        const clonedState = JSON.parse(JSON.stringify(state));
        this.workerState.apple1.loadEmulatorState(clonedState);
        
        // Reset clock timing data to prevent timing issues after state restore
        this.workerState.apple1.clock.resetTiming();
        
        // Always restart the main loop after loading state
        this.workerState.apple1.startLoop();
        
        // Force video update after restore
        if (typeof this.workerState.video.forceUpdate === 'function') {
            this.workerState.video.forceUpdate();
        }
    }
    
    getEmulationStatus(): 'running' | 'paused' {
        return this.workerState.isPaused ? 'paused' : 'running';
    }
    
    // ========== Breakpoint Management ==========
    
    setBreakpoint(address: number): number[] {
        this.workerState.breakpoints.add(address);
        this.workerState.updateBreakpointHook();
        return Array.from(this.workerState.breakpoints);
    }
    
    clearBreakpoint(address: number): number[] {
        this.workerState.breakpoints.delete(address);
        this.workerState.updateBreakpointHook();
        return Array.from(this.workerState.breakpoints);
    }
    
    clearAllBreakpoints(): void {
        this.workerState.breakpoints.clear();
        this.workerState.updateBreakpointHook();
    }
    
    getBreakpoints(): number[] {
        return Array.from(this.workerState.breakpoints);
    }
    
    runToAddress(address: number): void {
        const targetAddress = address;
        
        // Don't run if we're already at the target address
        if (this.workerState.apple1.cpu.PC === targetAddress) {
            loggingService.log('info', 'RunToAddress', 
                `Already at target address ${Formatters.address(targetAddress)}`);
            return;
        }
        
        // Store the run-to-cursor target
        this.workerState.runToCursorTarget = targetAddress;
        
        // Notify UI about the run-to-cursor target
        postMessage({ 
            data: this.workerState.runToCursorTarget, 
            type: 'RUN_TO_CURSOR_TARGET' as unknown as WORKER_MESSAGES
        });
        
        // Set up a temporary execution hook for run-to-address
        let runToAddressHit = false;
        
        this.workerState.apple1.cpu.setExecutionHook((pc: number) => {
            // Skip breakpoint check if we're stepping
            if (this.workerState.isStepping) {
                return true;
            }
            
            // Check existing breakpoints first
            if (!this.workerState.isPaused && this.workerState.breakpoints.has(pc)) {
                // Hit a breakpoint - pause execution
                this.workerState.apple1.clock.pause();
                this.workerState.isPaused = true;
                postMessage({ 
                    data: { paused: true }, 
                    type: 'EMULATION_STATUS' as unknown as WORKER_MESSAGES
                });
                postMessage({ 
                    data: pc, 
                    type: 'BREAKPOINT_HIT' as unknown as WORKER_MESSAGES
                });
                loggingService.log('info', 'Breakpoint', 
                    `Hit breakpoint at ${Formatters.address(pc)}`);
                return false; // Halt execution
            }
            
            // Check if we've reached the target address
            if (pc === targetAddress && !runToAddressHit) {
                runToAddressHit = true;
                // Clear run-to-cursor target
                this.workerState.runToCursorTarget = null;
                // Pause execution
                this.workerState.apple1.clock.pause();
                this.workerState.isPaused = true;
                // Restore normal breakpoint hook
                this.workerState.updateBreakpointHook();
                // Send notifications
                postMessage({ 
                    data: { paused: true }, 
                    type: 'EMULATION_STATUS' as unknown as WORKER_MESSAGES
                });
                postMessage({ 
                    data: null, 
                    type: 'RUN_TO_CURSOR_TARGET' as unknown as WORKER_MESSAGES
                });
                loggingService.log('info', 'RunToAddress', 
                    `Reached target address ${Formatters.address(targetAddress)}`);
                return false; // Halt execution
            }
            
            return true; // Continue execution
        });
        
        // Resume execution to run to the target
        if (this.workerState.isPaused) {
            this.workerState.apple1.clock.resume();
            this.workerState.isPaused = false;
            postMessage({ 
                data: { paused: false }, 
                type: 'EMULATION_STATUS' as unknown as WORKER_MESSAGES
            });
        }
        
        loggingService.log('info', 'RunToAddress', 
            `Running to address ${Formatters.address(targetAddress)}`);
    }
    
    // ========== Memory Operations ==========
    
    readMemoryRange(start: number, length: number): number[] {
        const memoryData: number[] = [];
        for (let i = 0; i < length; i++) {
            const addr = start + i;
            if (addr >= 0 && addr <= 0xFFFF) {
                memoryData.push(this.workerState.apple1.bus.read(addr));
            } else {
                memoryData.push(0);
            }
        }
        return memoryData;
    }
    
    writeMemory(address: number, value: number): void {
        if (address >= 0 && address <= 0xFFFF && 
            value >= 0 && value <= 0xFF) {
            this.workerState.apple1.bus.write(address, value);
        } else {
            loggingService.log('warn', 'MemoryWrite', 
                `Invalid memory write request: address=${address}, value=${value}`);
        }
    }
    
    getMemoryMap(): MemoryMapData {
        return {
            regions: [
                // RAM Bank 1
                {
                    start: 0x0000,
                    end: 0x0FFF,
                    type: 'RAM',
                    writable: true,
                    description: 'Main RAM (4KB)'
                },
                // Unmapped region 1
                {
                    start: 0x1000,
                    end: 0xD00F,
                    type: 'UNMAPPED',
                    writable: false,
                    description: 'Unmapped'
                },
                // PIA (I/O)
                {
                    start: 0xD010,
                    end: 0xD013,
                    type: 'IO',
                    writable: true,
                    description: 'PIA6820 - Keyboard & Display'
                },
                // Unmapped region 2
                {
                    start: 0xD014,
                    end: 0xDFFF,
                    type: 'UNMAPPED',
                    writable: false,
                    description: 'Unmapped'
                },
                // RAM Bank 2
                {
                    start: 0xE000,
                    end: 0xEFFF,
                    type: 'RAM',
                    writable: true,
                    description: 'Extended RAM (4KB)'
                },
                // Unmapped region 3
                {
                    start: 0xF000,
                    end: 0xFEFF,
                    type: 'UNMAPPED',
                    writable: false,
                    description: 'Unmapped'
                },
                // ROM
                {
                    start: 0xFF00,
                    end: 0xFFFF,
                    type: 'ROM',
                    writable: false,
                    description: 'Monitor ROM (256 bytes)'
                }
            ]
        };
    }
    
    // ========== Configuration ==========
    
    setCrtBsSupport(enabled: boolean): void {
        this.workerState.video.setSupportBS(enabled);
    }
    
    setCpuProfiling(enabled: boolean): void {
        this.workerState.apple1.cpu.setProfilingEnabled(enabled);
    }
    
    setCycleAccurateMode(enabled: boolean): void {
        this.workerState.apple1.cpu.setCycleAccurateMode(enabled);
    }
    
    setDebuggerActive(active: boolean): void {
        this.workerState.updateDebuggerState(active);
    }
    
    // ========== Input ==========
    
    keyDown(key: string): void {
        this.workerState.keyboard.write(key);
    }
    
    // ========== Debug Information ==========
    
    getDebugInfo(): DebugData {
        const { clock, cpu, pia, bus } = this.workerState.apple1;
        return {
            cpu: this.filterDebugData(cpu.toDebug()),
            pia: this.filterDebugData(pia.toDebug()),
            Bus: this.filterDebugData(bus.toDebug()),
            clock: this.filterDebugData(clock.toDebug()),
        };
    }
    
    // ========== Event Subscriptions ==========
    // These will be implemented in Phase 1 with Comlink.proxy
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onVideoUpdate(_callback: (data: VideoData) => void): () => void {
        // TODO: Implement with Comlink.proxy in Phase 1
        console.warn('onVideoUpdate not yet implemented - coming in Phase 1');
        return () => {};
    }
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onBreakpointHit(_callback: (address: number) => void): () => void {
        // TODO: Implement with Comlink.proxy in Phase 1
        console.warn('onBreakpointHit not yet implemented - coming in Phase 1');
        return () => {};
    }
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onEmulationStatus(_callback: (status: 'running' | 'paused') => void): () => void {
        // TODO: Implement with Comlink.proxy in Phase 1
        console.warn('onEmulationStatus not yet implemented - coming in Phase 1');
        return () => {};
    }
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onLogMessage(_callback: (data: LogMessageData) => void): () => void {
        // TODO: Implement with Comlink.proxy in Phase 1
        console.warn('onLogMessage not yet implemented - coming in Phase 1');
        return () => {};
    }
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onClockData(_callback: (data: ClockData) => void): () => void {
        // TODO: Implement with Comlink.proxy in Phase 1
        console.warn('onClockData not yet implemented - coming in Phase 1');
        return () => {};
    }
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onRunToCursorTarget(_callback: (target: number | null) => void): () => void {
        // TODO: Implement with Comlink.proxy in Phase 1
        console.warn('onRunToCursorTarget not yet implemented - coming in Phase 1');
        return () => {};
    }
}