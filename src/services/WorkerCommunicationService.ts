import { WORKER_MESSAGES, StateMessage, DebugData, LogMessageData, MemoryRangeRequest, MemoryRangeData } from '../apple1/TSTypes';

/**
 * Service abstraction for Worker communication
 * Provides a type-safe, promise-based API for communicating with the emulation worker
 */
export class WorkerCommunicationService {
    private worker: Worker;
    private messageHandlers: Map<WORKER_MESSAGES, Set<(data: any) => void>> = new Map();
    private pendingRequests: Map<string, { resolve: (data: any) => void; reject: (error: Error) => void }> = new Map();
    private requestCounter = 0;

    constructor(worker: Worker) {
        this.worker = worker;
        this.setupMessageHandler();
    }

    /**
     * Set up the main message handler for the worker
     */
    private setupMessageHandler(): void {
        this.worker.addEventListener('message', (event) => {
            const { data } = event;
            const messageType = data.type as WORKER_MESSAGES;
            
            // Handle responses to requests
            if (data.requestId && this.pendingRequests.has(data.requestId)) {
                const { resolve } = this.pendingRequests.get(data.requestId)!;
                this.pendingRequests.delete(data.requestId);
                resolve(data.data);
                return;
            }

            // Handle regular messages
            const handlers = this.messageHandlers.get(messageType);
            if (handlers) {
                handlers.forEach(handler => handler(data.data));
            }
        });
    }

    /**
     * Subscribe to worker messages of a specific type
     */
    on<T = any>(messageType: WORKER_MESSAGES, handler: (data: T) => void): () => void {
        if (!this.messageHandlers.has(messageType)) {
            this.messageHandlers.set(messageType, new Set());
        }
        this.messageHandlers.get(messageType)!.add(handler);

        // Return unsubscribe function
        return () => {
            const handlers = this.messageHandlers.get(messageType);
            if (handlers) {
                handlers.delete(handler);
            }
        };
    }

    /**
     * Send a message to the worker without expecting a response
     */
    send(type: WORKER_MESSAGES, data?: any): void {
        this.worker.postMessage({ type, data });
    }

    /**
     * Send a request to the worker and wait for a response
     */
    private async request<T>(type: WORKER_MESSAGES, data?: any, responseType?: WORKER_MESSAGES): Promise<T> {
        const requestId = `${type}_${this.requestCounter++}`;
        
        return new Promise((resolve, reject) => {
            this.pendingRequests.set(requestId, { resolve, reject });
            
            // Set timeout for request
            const timeout = setTimeout(() => {
                if (this.pendingRequests.has(requestId)) {
                    this.pendingRequests.delete(requestId);
                    reject(new Error(`Request ${type} timed out`));
                }
            }, 5000);

            // Listen for response if responseType is specified
            if (responseType) {
                const unsubscribe = this.on(responseType, (data) => {
                    clearTimeout(timeout);
                    unsubscribe();
                    if (this.pendingRequests.has(requestId)) {
                        const { resolve } = this.pendingRequests.get(requestId)!;
                        this.pendingRequests.delete(requestId);
                        resolve(data);
                    }
                });
            }

            this.worker.postMessage({ type, data, requestId });
        });
    }

    // High-level API methods

    /**
     * Emulation control
     */
    async pause(): Promise<void> {
        this.send(WORKER_MESSAGES.PAUSE_EMULATION);
    }

    async resume(): Promise<void> {
        this.send(WORKER_MESSAGES.RESUME_EMULATION);
    }

    async step(): Promise<void> {
        this.send(WORKER_MESSAGES.STEP);
    }

    async runToAddress(address: number): Promise<void> {
        this.send(WORKER_MESSAGES.RUN_TO_ADDRESS, address);
    }

    /**
     * State management
     */
    async saveState(): Promise<StateMessage['data']> {
        return this.request<StateMessage['data']>(
            WORKER_MESSAGES.SAVE_STATE,
            undefined,
            WORKER_MESSAGES.STATE_DATA
        );
    }

    async loadState(state: StateMessage['data']): Promise<void> {
        this.send(WORKER_MESSAGES.LOAD_STATE, state);
    }

    /**
     * Memory access
     */
    async getMemoryRange(start: number, length: number): Promise<MemoryRangeData> {
        return this.request<MemoryRangeData>(
            WORKER_MESSAGES.GET_MEMORY_RANGE,
            { start, length } as MemoryRangeRequest,
            WORKER_MESSAGES.MEMORY_RANGE_DATA
        );
    }

    /**
     * Breakpoint management
     */
    async setBreakpoint(address: number): Promise<void> {
        this.send(WORKER_MESSAGES.SET_BREAKPOINT, address);
    }

    async clearBreakpoint(address: number): Promise<void> {
        this.send(WORKER_MESSAGES.CLEAR_BREAKPOINT, address);
    }

    async clearAllBreakpoints(): Promise<void> {
        this.send(WORKER_MESSAGES.CLEAR_ALL_BREAKPOINTS);
    }

    async getBreakpoints(): Promise<number[]> {
        return this.request<number[]>(
            WORKER_MESSAGES.GET_BREAKPOINTS,
            undefined,
            WORKER_MESSAGES.BREAKPOINTS_DATA
        );
    }

    /**
     * Configuration
     */
    setCrtBsSupport(enabled: boolean): void {
        this.send(WORKER_MESSAGES.SET_CRT_BS_SUPPORT_FLAG, enabled);
    }

    setCpuProfiling(enabled: boolean): void {
        this.send(WORKER_MESSAGES.SET_CPU_PROFILING, enabled);
    }

    setCycleAccurateTiming(enabled: boolean): void {
        this.send(WORKER_MESSAGES.SET_CYCLE_ACCURATE_TIMING, enabled);
    }

    /**
     * Keyboard input
     */
    sendKeyDown(keyCode: number): void {
        this.send(WORKER_MESSAGES.KEY_DOWN, keyCode);
    }

    /**
     * Cleanup
     */
    dispose(): void {
        this.messageHandlers.clear();
        this.pendingRequests.clear();
    }
}