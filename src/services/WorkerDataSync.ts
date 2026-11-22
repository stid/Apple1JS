import { WorkerManager } from './WorkerManager';
import { FilteredDebugData } from '../apple1/types/worker-messages';
import { loggingService } from './LoggingService';

type DataSubscriber<T> = (data: T) => void;

/** Debug-info poll interval in ms, by emulation state. */
const DEBUG_INFO_INTERVAL = {
    running: 250, // smooth PC updates while the machine runs
    paused: 100, // responsive stepping
} as const;

/**
 * Single source of debug info for the UI: one poll of the worker, fanned out
 * to subscribers, instead of each component polling on its own.
 *
 * The poll only runs while a debug view (Inspector, Debugger) is on screen and
 * only passes on payloads that changed.
 */
export class WorkerDataSync {
    private debugInfoSubscribers = new Set<DataSubscriber<FilteredDebugData>>();
    private latestDebugInfo: FilteredDebugData | null = null;
    // Serialized form of the last payload handed to subscribers.
    private lastDebugInfoJson: string | null = null;
    private debugInfoInterval: number | null = null;

    private isPaused = false;
    // How many debug views are on screen. Debug info is only polled while this
    // is non-zero.
    private activeDebugViews = 0;

    private statusUnsubscribe: (() => void) | null = null;

    constructor(private workerManager: WorkerManager) {
        this.setupStatusListener();
    }

    private async setupStatusListener(): Promise<void> {
        try {
            const result = await this.workerManager.onEmulationStatus((status) => {
                this.isPaused = status === 'paused';
                this.updatePolling();
                // A pause (button, breakpoint, run-to-cursor) is when the PC
                // matters to everyone, poll or no poll: fetch it once.
                if (this.isPaused && this.debugInfoSubscribers.size > 0) {
                    void this.fetchDebugInfo();
                }
            });

            if (result && typeof result === 'function') {
                this.statusUnsubscribe = result;
            }
        } catch (error) {
            loggingService.error('WorkerDataSync', `Failed to setup status listener: ${error}`);
        }
    }

    /** (Re)start or stop the poll to match subscribers, visible views and run state. */
    private updatePolling(): void {
        this.stopPolling();
        if (this.debugInfoSubscribers.size === 0 || this.activeDebugViews === 0) {
            return;
        }
        void this.fetchDebugInfo();
        const interval = this.isPaused ? DEBUG_INFO_INTERVAL.paused : DEBUG_INFO_INTERVAL.running;
        this.debugInfoInterval = window.setInterval(() => void this.fetchDebugInfo(), interval);
    }

    private stopPolling(): void {
        if (this.debugInfoInterval !== null) {
            clearInterval(this.debugInfoInterval);
            this.debugInfoInterval = null;
        }
    }

    /**
     * A debug view came on screen (true) or left it (false). Calls are counted,
     * so two views can overlap during a tab switch without stopping the poll.
     * With no view open nothing reads the data, so nothing is fetched: this used
     * to poll 4-10 times a second for the whole life of the app.
     */
    public setDebuggerActive(active: boolean): void {
        this.activeDebugViews = Math.max(0, this.activeDebugViews + (active ? 1 : -1));
        this.updatePolling();
    }

    public subscribeToDebugInfo(callback: DataSubscriber<FilteredDebugData>): () => void {
        this.debugInfoSubscribers.add(callback);
        if (this.debugInfoSubscribers.size === 1) {
            this.updatePolling();
        }

        // A late subscriber gets the latest data straight away.
        if (this.latestDebugInfo) {
            callback(this.latestDebugInfo);
        }

        return () => {
            this.debugInfoSubscribers.delete(callback);
            if (this.debugInfoSubscribers.size === 0) {
                this.stopPolling();
            }
        };
    }

    private async fetchDebugInfo(): Promise<void> {
        try {
            const data = await this.workerManager.getDebugInfo();
            if (!data) {
                throw new Error('No debug info received');
            }

            // A paused machine returns the same payload on every poll. Handing
            // subscribers a fresh but identical object re-rendered the whole
            // debugger each time, so only a real change is passed on.
            const json = JSON.stringify(data);
            if (json === this.lastDebugInfoJson) {
                return;
            }
            this.lastDebugInfoJson = json;
            this.latestDebugInfo = data;

            this.debugInfoSubscribers.forEach((callback) => {
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

    /** Fetch now, outside the poll (after an action that changes the data). */
    public async refreshDebugInfo(): Promise<void> {
        await this.fetchDebugInfo();
    }

    public dispose(): void {
        this.stopPolling();
        this.debugInfoSubscribers.clear();
        this.latestDebugInfo = null;
        this.lastDebugInfoJson = null;
        this.activeDebugViews = 0;

        if (this.statusUnsubscribe) {
            this.statusUnsubscribe();
            this.statusUnsubscribe = null;
        }
    }
}
