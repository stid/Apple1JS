import { WORKER_MESSAGES, EmulatorState, MemoryRangeRequest } from '../TSTypes';

/**
 * Base worker message type
 */
interface BaseWorkerMessage<T extends WORKER_MESSAGES, D = unknown> {
    type: T;
    data?: D;
}

/**
 * All possible worker message types
 */
export type WorkerMessage =
    | BaseWorkerMessage<WORKER_MESSAGES.SET_CRT_BS_SUPPORT_FLAG, boolean>
    | BaseWorkerMessage<WORKER_MESSAGES.KEY_DOWN, string>
    | BaseWorkerMessage<WORKER_MESSAGES.DEBUG_INFO>
    | BaseWorkerMessage<WORKER_MESSAGES.SAVE_STATE>
    | BaseWorkerMessage<WORKER_MESSAGES.LOAD_STATE, EmulatorState>
    | BaseWorkerMessage<WORKER_MESSAGES.STATE_DATA, EmulatorState>
    | BaseWorkerMessage<WORKER_MESSAGES.PAUSE_EMULATION>
    | BaseWorkerMessage<WORKER_MESSAGES.RESUME_EMULATION>
    | BaseWorkerMessage<WORKER_MESSAGES.GET_MEMORY_RANGE, MemoryRangeRequest>
    | BaseWorkerMessage<WORKER_MESSAGES.SET_CPU_PROFILING, boolean>
    | BaseWorkerMessage<WORKER_MESSAGES.SET_CYCLE_ACCURATE_TIMING, boolean>
    | BaseWorkerMessage<WORKER_MESSAGES.STEP>
    | BaseWorkerMessage<WORKER_MESSAGES.SET_BREAKPOINT, number>
    | BaseWorkerMessage<WORKER_MESSAGES.CLEAR_BREAKPOINT, number>
    | BaseWorkerMessage<WORKER_MESSAGES.CLEAR_ALL_BREAKPOINTS>
    | BaseWorkerMessage<WORKER_MESSAGES.GET_BREAKPOINTS>
    | BaseWorkerMessage<WORKER_MESSAGES.SET_DEBUGGER_ACTIVE, boolean>;

/**
 * Type guard to check if a message is a valid WorkerMessage
 */
export function isWorkerMessage(data: unknown): data is WorkerMessage {
    return typeof data === 'object' && 
           data !== null && 
           'type' in data &&
           typeof (data as {type: unknown}).type === 'number';
}