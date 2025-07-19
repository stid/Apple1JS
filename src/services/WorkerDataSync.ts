import { WorkerManager } from './WorkerManager';
import { FilteredDebugData } from '../apple1/types/worker-messages';
import { loggingService } from './LoggingService';

/**
 * Subscriber callback type for data updates
 */
type DataSubscriber<T> = (data: T) => void;

/**
 * Configuration for polling intervals
 */
interface PollingConfig {
    debugInfoInterval: {
        running: number;
        paused: number;
    };
    memoryInterval: number;
    breakpointsInterval: number;
}

/**
 * Cached data with timestamp
 */
interface CachedData<T> {
    data: T;
    timestamp: number;
}


/**
 * WorkerDataSync service manages centralized polling and caching of worker data
 * to prevent multiple components from polling independently and blocking the main thread
 */
export class WorkerDataSync {
    private workerManager: WorkerManager;
    private config: PollingConfig;
    
    // Subscribers
    private debugInfoSubscribers = new Set<DataSubscriber<FilteredDebugData>>();
    private breakpointsSubscribers = new Set<DataSubscriber<number[]>>();
    private memorySubscribers = new Map<string, Set<DataSubscriber<number[]>>>();
    
    // Cached data
    private debugInfoCache: CachedData<FilteredDebugData> | null = null;
    private breakpointsCache: CachedData<number[]> | null = null;
    private memoryCache = new Map<string, CachedData<number[]>>();
    
    // Polling state
    private debugInfoInterval: number | null = null;
    private breakpointsInterval: number | null = null;
    private memoryIntervals = new Map<string, number>();
    
    // Emulation state
    private isPaused = false;
    
    // Cleanup functions
    private statusUnsubscribe: (() => void) | null = null;
    
    constructor(workerManager: WorkerManager) {
        this.workerManager = workerManager;
        this.config = {
            debugInfoInterval: {
                running: 2000,  // 2 seconds when running
                paused: 500     // 500ms when paused
            },
            memoryInterval: 1000,    // 1 second for memory updates
            breakpointsInterval: 2000 // 2 seconds for breakpoints
        };
        
        // Subscribe to emulation status changes
        this.setupStatusListener();
    }
    
    /**
     * Set up listener for emulation status changes
     */
    private async setupStatusListener(): Promise<void> {
        try {
            const result = await this.workerManager.onEmulationStatus((status) => {
                this.isPaused = status === 'paused';
                this.updatePollingIntervals();
            });
            
            // Store unsubscribe function if available
            if (result && typeof result === 'function') {
                this.statusUnsubscribe = result;
            }
        } catch (error) {
            loggingService.error('WorkerDataSync', `Failed to setup status listener: ${error}`);
        }
    }
    
    /**
     * Update polling intervals based on current state
     */
    private updatePollingIntervals(): void {
        // Update debug info polling interval
        if (this.debugInfoSubscribers.size > 0) {
            this.stopDebugInfoPolling();
            this.startDebugInfoPolling();
        }
    }
    
    /**
     * Set debugger active state
     */
    public setDebuggerActive(active: boolean): void {
        // Note: active parameter is not used yet, but kept for API compatibility
        void active;
        // Just update polling intervals based on paused state
        this.updatePollingIntervals();
    }
    
    /**
     * Create a unique key for memory range
     */
    private getMemoryKey(start: number, length: number): string {
        return `${start}:${length}`;
    }
    
    /**
     * Subscribe to debug info updates
     */
    public subscribeToDebugInfo(callback: DataSubscriber<FilteredDebugData>): () => void {
        this.debugInfoSubscribers.add(callback);
        
        // Start polling if this is the first subscriber
        if (this.debugInfoSubscribers.size === 1) {
            this.startDebugInfoPolling();
        }
        
        // Send cached data immediately if available
        if (this.debugInfoCache) {
            callback(this.debugInfoCache.data);
        }
        
        // Return unsubscribe function
        return () => {
            this.debugInfoSubscribers.delete(callback);
            if (this.debugInfoSubscribers.size === 0) {
                this.stopDebugInfoPolling();
            }
        };
    }
    
    /**
     * Subscribe to breakpoints updates
     */
    public subscribeToBreakpoints(callback: DataSubscriber<number[]>): () => void {
        this.breakpointsSubscribers.add(callback);
        
        // Start polling if this is the first subscriber
        if (this.breakpointsSubscribers.size === 1) {
            this.startBreakpointsPolling();
        }
        
        // Send cached data immediately if available
        if (this.breakpointsCache) {
            callback(this.breakpointsCache.data);
        }
        
        // Return unsubscribe function
        return () => {
            this.breakpointsSubscribers.delete(callback);
            if (this.breakpointsSubscribers.size === 0) {
                this.stopBreakpointsPolling();
            }
        };
    }
    
    /**
     * Subscribe to memory range updates
     */
    public subscribeToMemoryRange(
        start: number, 
        length: number, 
        callback: DataSubscriber<number[]>
    ): () => void {
        const key = this.getMemoryKey(start, length);
        
        // Get or create subscriber set for this range
        let subscribers = this.memorySubscribers.get(key);
        if (!subscribers) {
            subscribers = new Set();
            this.memorySubscribers.set(key, subscribers);
        }
        
        subscribers.add(callback);
        
        // Start polling if this is the first subscriber for this range
        if (subscribers.size === 1) {
            this.startMemoryPolling(start, length);
        }
        
        // Send cached data immediately if available
        const cached = this.memoryCache.get(key);
        if (cached) {
            callback(cached.data);
        }
        
        // Return unsubscribe function
        return () => {
            const subs = this.memorySubscribers.get(key);
            if (subs) {
                subs.delete(callback);
                if (subs.size === 0) {
                    this.stopMemoryPolling(start, length);
                    this.memorySubscribers.delete(key);
                }
            }
        };
    }
    
    /**
     * Start polling for debug info
     */
    private startDebugInfoPolling(): void {
        // Fetch immediately
        this.fetchDebugInfo();
        
        // Set up interval based on current state
        const interval = this.isPaused 
            ? this.config.debugInfoInterval.paused 
            : this.config.debugInfoInterval.running;
            
        this.debugInfoInterval = window.setInterval(() => {
            this.fetchDebugInfo();
        }, interval);
    }
    
    /**
     * Stop polling for debug info
     */
    private stopDebugInfoPolling(): void {
        if (this.debugInfoInterval !== null) {
            clearInterval(this.debugInfoInterval);
            this.debugInfoInterval = null;
        }
    }
    
    /**
     * Start polling for breakpoints
     */
    private startBreakpointsPolling(): void {
        // Fetch immediately
        this.fetchBreakpoints();
        
        // Set up interval
        this.breakpointsInterval = window.setInterval(() => {
            this.fetchBreakpoints();
        }, this.config.breakpointsInterval);
    }
    
    /**
     * Stop polling for breakpoints
     */
    private stopBreakpointsPolling(): void {
        if (this.breakpointsInterval !== null) {
            clearInterval(this.breakpointsInterval);
            this.breakpointsInterval = null;
        }
    }
    
    /**
     * Start polling for memory range
     */
    private startMemoryPolling(start: number, length: number): void {
        const key = this.getMemoryKey(start, length);
        
        // Fetch immediately
        this.fetchMemoryRange(start, length);
        
        // Set up interval
        const intervalId = window.setInterval(() => {
            this.fetchMemoryRange(start, length);
        }, this.config.memoryInterval);
        
        this.memoryIntervals.set(key, intervalId);
    }
    
    /**
     * Stop polling for memory range
     */
    private stopMemoryPolling(start: number, length: number): void {
        const key = this.getMemoryKey(start, length);
        const intervalId = this.memoryIntervals.get(key);
        
        if (intervalId !== undefined) {
            clearInterval(intervalId);
            this.memoryIntervals.delete(key);
        }
    }
    
    /**
     * Fetch debug info from worker
     */
    private async fetchDebugInfo(): Promise<void> {
        try {
            const data = await this.workerManager.getDebugInfo();
            if (!data) {
                throw new Error('No debug info received');
            }
            
            // Update cache
            this.debugInfoCache = {
                data,
                timestamp: Date.now()
            };
            
            // Notify subscribers
            this.debugInfoSubscribers.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    loggingService.error('WorkerDataSync', `Error in debug info subscriber: ${error}`);
                }
            });
        } catch (error) {
            loggingService.error('WorkerDataSync', `Failed to fetch debug info: ${error}`);
        }
    }
    
    /**
     * Fetch breakpoints from worker
     */
    private async fetchBreakpoints(): Promise<void> {
        try {
            const data = await this.workerManager.getBreakpoints();
            if (!data) {
                throw new Error('No breakpoints data received');
            }
            
            // Update cache
            this.breakpointsCache = {
                data,
                timestamp: Date.now()
            };
            
            // Notify subscribers
            this.breakpointsSubscribers.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    loggingService.error('WorkerDataSync', `Error in breakpoints subscriber: ${error}`);
                }
            });
        } catch (error) {
            loggingService.error('WorkerDataSync', `Failed to fetch breakpoints: ${error}`);
        }
    }
    
    /**
     * Fetch memory range from worker
     */
    private async fetchMemoryRange(start: number, length: number): Promise<void> {
        const key = this.getMemoryKey(start, length);
        
        try {
            const data = await this.workerManager.readMemoryRange(start, length);
            if (!data) {
                throw new Error('No memory data received');
            }
            
            // Update cache
            this.memoryCache.set(key, {
                data,
                timestamp: Date.now()
            });
            
            // Notify subscribers for this range
            const subscribers = this.memorySubscribers.get(key);
            if (subscribers) {
                subscribers.forEach(callback => {
                    try {
                        callback(data);
                    } catch (error) {
                        loggingService.error('WorkerDataSync', `Error in memory subscriber: ${error}`);
                    }
                });
            }
        } catch (error) {
            loggingService.error('WorkerDataSync', `Failed to fetch memory range ${start}:${length}: ${error}`);
        }
    }
    
    /**
     * Get cached debug info if available
     */
    public getCachedDebugInfo(): FilteredDebugData | null {
        return this.debugInfoCache?.data || null;
    }
    
    /**
     * Get cached breakpoints if available
     */
    public getCachedBreakpoints(): number[] | null {
        return this.breakpointsCache?.data || null;
    }
    
    /**
     * Get cached memory range if available
     */
    public getCachedMemoryRange(start: number, length: number): number[] | null {
        const key = this.getMemoryKey(start, length);
        return this.memoryCache.get(key)?.data || null;
    }
    
    /**
     * Force refresh of debug info
     */
    public async refreshDebugInfo(): Promise<void> {
        await this.fetchDebugInfo();
    }
    
    /**
     * Force refresh of breakpoints
     */
    public async refreshBreakpoints(): Promise<void> {
        await this.fetchBreakpoints();
    }
    
    /**
     * Force refresh of memory range
     */
    public async refreshMemoryRange(start: number, length: number): Promise<void> {
        await this.fetchMemoryRange(start, length);
    }
    
    /**
     * Clean up all polling intervals
     */
    public dispose(): void {
        // Stop all polling
        this.stopDebugInfoPolling();
        this.stopBreakpointsPolling();
        
        // Stop all memory polling
        this.memoryIntervals.forEach(intervalId => clearInterval(intervalId));
        this.memoryIntervals.clear();
        
        // Clear subscribers
        this.debugInfoSubscribers.clear();
        this.breakpointsSubscribers.clear();
        this.memorySubscribers.clear();
        
        // Clear cache
        this.debugInfoCache = null;
        this.breakpointsCache = null;
        this.memoryCache.clear();
        
        // Unsubscribe from status listener
        if (this.statusUnsubscribe) {
            this.statusUnsubscribe();
            this.statusUnsubscribe = null;
        }
    }
}