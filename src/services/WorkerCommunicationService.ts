import { 
    WORKER_MESSAGES, 
    StateMessage, 
    MemoryRangeData,
    ExtractPayload,
    sendWorkerMessage,
    sendWorkerMessageWithRequest,
    isWorkerMessage
} from '../apple1/types/worker-messages';

/**
 * Service abstraction for Worker communication
 * Provides a type-safe, promise-based API for communicating with the emulation worker
 */
export class WorkerCommunicationService {
    private worker: Worker;
    private messageHandlers: Map<WORKER_MESSAGES, Set<(data: unknown) => void>> = new Map();
    private pendingRequests: Map<string, { resolve: (data: unknown) => void; reject: (error: Error) => void }> = new Map();
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
            
            // Validate message format
            if (!isWorkerMessage(data)) {
                console.warn('Received invalid worker message:', data);
                return;
            }
            
            const messageType = data.type;
            
            // Handle responses to requests
            if (data.requestId && this.pendingRequests.has(data.requestId)) {
                const { resolve } = this.pendingRequests.get(data.requestId)!;
                this.pendingRequests.delete(data.requestId);
                resolve('data' in data ? data.data : undefined);
                return;
            }

            // Handle regular messages
            const handlers = this.messageHandlers.get(messageType);
            if (handlers) {
                const payload = 'data' in data ? data.data : undefined;
                handlers.forEach(handler => handler(payload));
            }
        });
    }

    /**
     * Subscribe to worker messages of a specific type
     */
    on<T = unknown>(messageType: WORKER_MESSAGES, handler: (data: T) => void): () => void {
        if (!this.messageHandlers.has(messageType)) {
            this.messageHandlers.set(messageType, new Set());
        }
        // Cast handler to match the internal type
        const internalHandler = handler as (data: unknown) => void;
        this.messageHandlers.get(messageType)!.add(internalHandler);

        // Return unsubscribe function
        return () => {
            const handlers = this.messageHandlers.get(messageType);
            if (handlers) {
                handlers.delete(internalHandler);
            }
        };
    }

    /**
     * Send a message to the worker without expecting a response
     */
    send<T extends WORKER_MESSAGES>(
        type: T,
        ...args: ExtractPayload<T> extends never ? [] : [data: ExtractPayload<T>]
    ): void {
        sendWorkerMessage(this.worker, type, ...args);
    }

    /**
     * Send a request to the worker and wait for a response
     */
    private async request<T, U extends WORKER_MESSAGES>(
        type: U, 
        responseType: WORKER_MESSAGES,
        ...args: ExtractPayload<U> extends never ? [] : [data: ExtractPayload<U>]
    ): Promise<T> {
        const requestId = `${type}_${this.requestCounter++}`;
        
        return new Promise<T>((resolve, reject) => {
            // Store typed resolve function
            const typedResolve = (value: unknown) => resolve(value as T);
            this.pendingRequests.set(requestId, { resolve: typedResolve, reject });
            
            // Set timeout for request
            const timeout = setTimeout(() => {
                if (this.pendingRequests.has(requestId)) {
                    this.pendingRequests.delete(requestId);
                    reject(new Error(`Request ${type} timed out`));
                }
            }, 5000);

            // Listen for response
            const unsubscribe = this.on<T>(responseType, (data) => {
                clearTimeout(timeout);
                unsubscribe();
                if (this.pendingRequests.has(requestId)) {
                    this.pendingRequests.delete(requestId);
                    resolve(data);
                }
            });

            sendWorkerMessageWithRequest(this.worker, type, requestId, ...args);
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
        return this.request<StateMessage['data'], typeof WORKER_MESSAGES.SAVE_STATE>(
            WORKER_MESSAGES.SAVE_STATE,
            WORKER_MESSAGES.STATE_DATA
        );
    }

    async loadState(state: StateMessage['data']): Promise<void> {
        this.send(WORKER_MESSAGES.LOAD_STATE, state!);
    }

    /**
     * Memory access
     */
    async getMemoryRange(start: number, length: number): Promise<MemoryRangeData> {
        return this.request<MemoryRangeData, typeof WORKER_MESSAGES.GET_MEMORY_RANGE>(
            WORKER_MESSAGES.GET_MEMORY_RANGE,
            WORKER_MESSAGES.MEMORY_RANGE_DATA,
            { start, length }
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
        return this.request<number[], typeof WORKER_MESSAGES.GET_BREAKPOINTS>(
            WORKER_MESSAGES.GET_BREAKPOINTS,
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
    sendKeyDown(keyCode: string): void {
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