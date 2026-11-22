import { useCallback, useSyncExternalStore } from 'react';
import type { WorkerManager } from '../services/WorkerManager';
import type { EngineStatusData } from '../apple1/types/worker-messages';
import { loggingService } from '../services/LoggingService';
import { REFRESH_RATES } from '../constants/ui';

/**
 * One engine-status poll per WorkerManager, shared by every component that
 * shows it. Each of them used to run its own interval, so the worker answered
 * the same question several times over and the copies drifted: switching engine
 * from one surface left the others stale until their next tick.
 */
class EngineStatusStore {
    private status: EngineStatusData | null = null;
    private listeners = new Set<() => void>();
    private timer: ReturnType<typeof setInterval> | null = null;

    constructor(private workerManager: WorkerManager) {}

    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        if (this.listeners.size === 1) {
            void this.refresh();
            this.timer = setInterval(() => void this.refresh(), REFRESH_RATES.ENGINE_STATUS);
        }
        return () => {
            this.listeners.delete(listener);
            if (this.listeners.size === 0 && this.timer !== null) {
                clearInterval(this.timer);
                this.timer = null;
            }
        };
    };

    getSnapshot = (): EngineStatusData | null => this.status;

    refresh = async (): Promise<void> => {
        try {
            this.status = await this.workerManager.getEngineStatus();
            this.listeners.forEach((listener) => listener());
        } catch (error) {
            loggingService.error('useEngineStatus', `Failed to get engine status: ${error}`);
        }
    };
}

const stores = new WeakMap<WorkerManager, EngineStatusStore>();

function storeFor(workerManager: WorkerManager): EngineStatusStore {
    let store = stores.get(workerManager);
    if (!store) {
        store = new EngineStatusStore(workerManager);
        stores.set(workerManager, store);
    }
    return store;
}

/**
 * Current engine status, kept fresh by a shared poll. Call `refresh` after an
 * action that changes it (an engine switch) so every consumer updates at once.
 */
export function useEngineStatus(workerManager: WorkerManager | undefined): {
    status: EngineStatusData | null;
    refresh: () => Promise<void>;
} {
    const store = workerManager ? storeFor(workerManager) : null;
    const status = useSyncExternalStore(store ? store.subscribe : subscribeToNothing, store ? store.getSnapshot : noStatus);
    const refresh = useCallback(() => (store ? store.refresh() : Promise.resolve()), [store]);
    return { status, refresh };
}

const subscribeToNothing = () => () => {};
const noStatus = () => null;
