import { WorkerState } from './WorkerState';
import { WorkerAPI } from './WorkerAPI';
import { WORKER_MESSAGES, MemoryRangeRequest, MemoryRangeData, MemoryWriteRequest, WorkerMessage, isWorkerMessage } from './types/worker-messages';
import type { EmulatorState } from './types/emulator-state';

// Create the worker state instance
const workerState = new WorkerState();

// Create the worker API instance
const workerAPI = new WorkerAPI(workerState);

// Export for backwards compatibility during migration
export const video = workerState.video;
export const keyboard = workerState.keyboard;

// Clean up on worker termination
globalThis.addEventListener('beforeunload', () => {
    workerState.cleanup();
});

onmessage = function (e: MessageEvent<WorkerMessage>) {
    const message = e.data;
    if (!isWorkerMessage(message)) {
        return;
    }

    const { type } = message;
    const data = 'data' in message ? message.data : undefined;

    // Handle messages using WorkerAPI methods
    switch (type) {
        case WORKER_MESSAGES.SET_CRT_BS_SUPPORT_FLAG:
            workerAPI.setCrtBsSupport(!!data);
            break;
        case WORKER_MESSAGES.KEY_DOWN:
            if (typeof data === 'string') {
                workerAPI.keyDown(data);
            }
            break;
        case WORKER_MESSAGES.DEBUG_INFO: {
            const debugData = workerAPI.getDebugInfo();
            postMessage({
                data: debugData,
                type: WORKER_MESSAGES.DEBUG_INFO,
            });
            break;
        }
        case WORKER_MESSAGES.SAVE_STATE: {
            const state = workerAPI.saveState();
            postMessage({ data: state, type: WORKER_MESSAGES.STATE_DATA });
            break;
        }
        case WORKER_MESSAGES.LOAD_STATE: {
            if (data && typeof data === 'object') {
                workerAPI.loadState(data as EmulatorState);
            }
            break;
        }
        case WORKER_MESSAGES.PAUSE_EMULATION: {
            workerAPI.pauseEmulation();
            break;
        }
        case WORKER_MESSAGES.RESUME_EMULATION: {
            workerAPI.resumeEmulation();
            break;
        }
        case WORKER_MESSAGES.GET_MEMORY_RANGE: {
            if (data && typeof data === 'object') {
                const request = data as MemoryRangeRequest & { mode?: string };
                const memoryData = workerAPI.readMemoryRange(request.start, request.length);
                const response: MemoryRangeData & { mode?: string } = {
                    start: request.start,
                    data: memoryData,
                    ...(request.mode !== undefined && { mode: request.mode })
                };
                postMessage({ data: response, type: WORKER_MESSAGES.MEMORY_RANGE_DATA });
            }
            break;
        }
        case WORKER_MESSAGES.SET_CPU_PROFILING: {
            if (typeof data === 'boolean') {
                workerAPI.setCpuProfiling(data);
            }
            break;
        }
        case WORKER_MESSAGES.SET_CYCLE_ACCURATE_TIMING: {
            if (typeof data === 'boolean') {
                workerAPI.setCycleAccurateMode(data);
            }
            break;
        }
        case WORKER_MESSAGES.STEP: {
            const debugData = workerAPI.step();
            postMessage({
                data: debugData,
                type: WORKER_MESSAGES.DEBUG_INFO,
            });
            break;
        }
        case WORKER_MESSAGES.SET_BREAKPOINT: {
            if (typeof data === 'number') {
                const breakpoints = workerAPI.setBreakpoint(data);
                postMessage({
                    data: breakpoints,
                    type: WORKER_MESSAGES.BREAKPOINTS_DATA
                });
            }
            break;
        }
        case WORKER_MESSAGES.CLEAR_BREAKPOINT: {
            if (typeof data === 'number') {
                const breakpoints = workerAPI.clearBreakpoint(data);
                postMessage({
                    data: breakpoints,
                    type: WORKER_MESSAGES.BREAKPOINTS_DATA
                });
            }
            break;
        }
        case WORKER_MESSAGES.CLEAR_ALL_BREAKPOINTS: {
            workerAPI.clearAllBreakpoints();
            postMessage({
                data: [],
                type: WORKER_MESSAGES.BREAKPOINTS_DATA
            });
            break;
        }
        case WORKER_MESSAGES.GET_BREAKPOINTS: {
            const breakpoints = workerAPI.getBreakpoints();
            postMessage({
                data: breakpoints,
                type: WORKER_MESSAGES.BREAKPOINTS_DATA
            });
            break;
        }
        case WORKER_MESSAGES.SET_DEBUGGER_ACTIVE: {
            if (typeof data === 'boolean') {
                workerAPI.setDebuggerActive(data);
            }
            break;
        }
        case WORKER_MESSAGES.GET_EMULATION_STATUS: {
            const status = workerAPI.getEmulationStatus();
            postMessage({ 
                data: { paused: status === 'paused' }, 
                type: WORKER_MESSAGES.EMULATION_STATUS 
            });
            break;
        }
        case WORKER_MESSAGES.RUN_TO_ADDRESS: {
            if (typeof data === 'number') {
                workerAPI.runToAddress(data);
            }
            break;
        }
        case WORKER_MESSAGES.WRITE_MEMORY: {
            if (data && typeof data === 'object') {
                const request = data as MemoryWriteRequest;
                workerAPI.writeMemory(request.address, request.value);
            }
            break;
        }
        case WORKER_MESSAGES.GET_MEMORY_MAP: {
            const memoryMap = workerAPI.getMemoryMap();
            postMessage({ 
                type: WORKER_MESSAGES.MEMORY_MAP_DATA, 
                data: memoryMap 
            });
            break;
        }
    }
};

// Start the emulation
workerState.startEmulation();
