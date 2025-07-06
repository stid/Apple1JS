import Apple1 from '.';
import WebWorkerKeyboard from './WebKeyboard';
import WebCRTVideo from './WebCRTVideo';
import type { WebCrtVideoSubFuncVideoType } from './@types/VideoTypes';
import { WORKER_MESSAGES, LogMessageData, MemoryRangeRequest, MemoryRangeData } from './TSTypes';
import { loggingService } from '../services/LoggingService';

export const video = new WebCRTVideo();
export const keyboard = new WebWorkerKeyboard();

video.subscribe((data: WebCrtVideoSubFuncVideoType) => {
    const { buffer, row, column } = data;
    postMessage({ data: { buffer, row, column }, type: WORKER_MESSAGES.UPDATE_VIDEO_BUFFER });
});

// Set up worker-to-main thread log message forwarding
loggingService.addHandler((level, source, message) => {
    const logData: LogMessageData = { level, source, message };
    postMessage({ data: logData, type: WORKER_MESSAGES.LOG_MESSAGE });
});

const apple1 = new Apple1({ video: video, keyboard: keyboard });

// Breakpoint management
const breakpoints = new Set<number>();
let isPaused = false;
let isStepping = false; // Track if we're in a step operation

// Setup execution hook for deterministic breakpoint checking
function updateBreakpointHook() {
    if (breakpoints.size === 0) {
        // No breakpoints - remove hook for performance
        apple1.cpu.setExecutionHook(undefined);
    } else {
        // Install hook to check breakpoints before each instruction
        apple1.cpu.setExecutionHook((pc: number) => {
            // Skip breakpoint check if we're stepping (to allow stepping over breakpoints)
            if (isStepping) {
                return true;
            }
            
            // Only check breakpoints when running (not already paused)
            if (!isPaused && breakpoints.has(pc)) {
                // Hit a breakpoint - pause execution
                apple1.clock.pause();
                isPaused = true;
                postMessage({ data: 'paused', type: WORKER_MESSAGES.EMULATION_STATUS });
                postMessage({ data: pc, type: WORKER_MESSAGES.BREAKPOINT_HIT });
                loggingService.log('info', 'Breakpoint', `Hit breakpoint at $${pc.toString(16).padStart(4, '0').toUpperCase()}`);
                return false; // Halt execution
            }
            return true; // Continue execution
        });
    }
}

import type { WorkerMessage } from './@types/WorkerMessages';

onmessage = function (e: MessageEvent<WorkerMessage>) {
    const message = e.data;
    if (!message || typeof message.type !== 'number') {
        return;
    }

    const { type, data } = message;

    switch (type) {
        case WORKER_MESSAGES.SET_CRT_BS_SUPPORT_FLAG:
            video.setSupportBS(!!data);
            break;
        case WORKER_MESSAGES.KEY_DOWN:
            if (typeof data === 'string') {
                keyboard.write(data);
            }
            break;
        case WORKER_MESSAGES.DEBUG_INFO: {
            const { clock, cpu, pia, bus } = apple1;
            postMessage({
                data: {
                    cpu: cpu.toDebug(),
                    pia: pia.toDebug(),
                    Bus: bus.toDebug(),
                    clock: clock.toDebug(),
                },
                type: WORKER_MESSAGES.DEBUG_INFO,
            });
            break;
        }
        case WORKER_MESSAGES.SAVE_STATE: {
            // Save full machine state
            const state = apple1.saveState();
            postMessage({ data: state, type: WORKER_MESSAGES.STATE_DATA });
            break;
        }
        case WORKER_MESSAGES.LOAD_STATE: {
            // Restore full machine state
            if (data && typeof data === 'object') {
                // Deep clone the state to ensure a new reference and trigger state change
                const clonedState = JSON.parse(JSON.stringify(data));
                apple1.loadState(clonedState);
                // Reset clock timing data to prevent timing issues after state restore
                apple1.clock.resetTiming();
                // Always restart the main loop after loading state
                apple1.startLoop();
                // Force video update after restore
                if (typeof video.forceUpdate === 'function') {
                    video.forceUpdate();
                }
            }
            break;
        }
        case WORKER_MESSAGES.PAUSE_EMULATION: {
            // Pause the clock/emulation
            apple1.clock.pause();
            isPaused = true;
            // Update debug interval if debugger is active
            if (debuggerActive) {
                updateDebuggerState(true); // Re-update to use faster interval
            }
            // Send status update
            postMessage({ data: 'paused', type: WORKER_MESSAGES.EMULATION_STATUS });
            break;
        }
        case WORKER_MESSAGES.RESUME_EMULATION: {
            // Resume the clock/emulation
            apple1.clock.resume();
            isPaused = false;
            // Update debug interval if debugger is active
            if (debuggerActive) {
                updateDebuggerState(true); // Re-update to use slower interval
            }
            // Send status update
            postMessage({ data: 'running', type: WORKER_MESSAGES.EMULATION_STATUS });
            break;
        }
        case WORKER_MESSAGES.GET_MEMORY_RANGE: {
            // Handle memory range request for disassembler
            if (data && typeof data === 'object') {
                const request = data as MemoryRangeRequest & { mode?: string };
                const memoryData: number[] = [];
                for (let i = 0; i < request.length; i++) {
                    const addr = request.start + i;
                    if (addr >= 0 && addr <= 0xFFFF) {
                        memoryData.push(apple1.bus.read(addr));
                    } else {
                        memoryData.push(0);
                    }
                }
                const response: MemoryRangeData & { mode?: string } = {
                    start: request.start,
                    data: memoryData,
                    mode: request.mode
                };
                postMessage({ data: response, type: WORKER_MESSAGES.MEMORY_RANGE_DATA });
            }
            break;
        }
        case WORKER_MESSAGES.SET_CPU_PROFILING: {
            // Enable/disable CPU performance profiling
            if (typeof data === 'boolean') {
                apple1.cpu.setProfilingEnabled(data);
            }
            break;
        }
        case WORKER_MESSAGES.SET_CYCLE_ACCURATE_TIMING: {
            // Enable/disable cycle-accurate timing mode
            if (typeof data === 'boolean') {
                apple1.cpu.setCycleAccurateMode(data);
            }
            break;
        }
        case WORKER_MESSAGES.STEP: {
            // Execute a single CPU instruction
            // First pause the clock to prevent concurrent execution
            apple1.clock.pause();
            isPaused = true;
            
            // Set stepping flag to bypass breakpoint check for this instruction
            isStepping = true;
            
            // Execute one instruction
            apple1.cpu.performSingleStep();
            
            // Clear stepping flag
            isStepping = false;
            
            // Check if we hit a breakpoint after stepping (at the new PC)
            if (breakpoints.has(apple1.cpu.PC)) {
                postMessage({
                    data: apple1.cpu.PC,
                    type: WORKER_MESSAGES.BREAKPOINT_HIT
                });
            }
            
            // Send updated debug info after step
            postMessage({
                data: {
                    cpu: apple1.cpu.toDebug(),
                    pia: apple1.pia.toDebug(),
                    Bus: apple1.bus.toDebug(),
                    clock: apple1.clock.toDebug(),
                },
                type: WORKER_MESSAGES.DEBUG_INFO,
            });
            break;
        }
        case WORKER_MESSAGES.SET_BREAKPOINT: {
            if (typeof data === 'number') {
                breakpoints.add(data);
                updateBreakpointHook(); // Update execution hook
                postMessage({
                    data: Array.from(breakpoints),
                    type: WORKER_MESSAGES.BREAKPOINTS_DATA
                });
            }
            break;
        }
        case WORKER_MESSAGES.CLEAR_BREAKPOINT: {
            if (typeof data === 'number') {
                breakpoints.delete(data);
                updateBreakpointHook(); // Update execution hook
                postMessage({
                    data: Array.from(breakpoints),
                    type: WORKER_MESSAGES.BREAKPOINTS_DATA
                });
            }
            break;
        }
        case WORKER_MESSAGES.CLEAR_ALL_BREAKPOINTS: {
            breakpoints.clear();
            updateBreakpointHook(); // Update execution hook
            postMessage({
                data: [],
                type: WORKER_MESSAGES.BREAKPOINTS_DATA
            });
            break;
        }
        case WORKER_MESSAGES.GET_BREAKPOINTS: {
            postMessage({
                data: Array.from(breakpoints),
                type: WORKER_MESSAGES.BREAKPOINTS_DATA
            });
            break;
        }
        case WORKER_MESSAGES.SET_DEBUGGER_ACTIVE: {
            // Update debugger state based on visibility
            if (typeof data === 'boolean') {
                updateDebuggerState(data);
            }
            break;
        }
    }
};

// Track debugger state
let debuggerActive = false;
let debugUpdateInterval: number | null = null;

// Function to start/stop debug updates based on debugger visibility
function updateDebuggerState(active: boolean) {
    debuggerActive = active;
    
    if (active && !debugUpdateInterval) {
        // Start sending debug updates
        debugUpdateInterval = setInterval(() => {
            const { cpu } = apple1;
            postMessage({
                data: {
                    cpu: { PC: cpu.PC }
                },
                type: WORKER_MESSAGES.DEBUG_DATA,
            });
        }, isPaused ? 100 : 250) as unknown as number; // Faster updates when paused
    } else if (!active && debugUpdateInterval) {
        // Stop sending debug updates
        clearInterval(debugUpdateInterval);
        debugUpdateInterval = null;
    }
}

// Initialize breakpoint hook on startup
updateBreakpointHook();

apple1.startLoop();
// Start in running state
isPaused = false;
