/**
 * A minimal multi-listener event source with unsubscribe and error isolation.
 *
 * WorkerAPI maintained five hand-written `Set<callback>` fields, each with the
 * same add / return-unsubscribe / `forEach(cb => cb(value))` shape. This
 * collapses that into one primitive. Listener errors are isolated so a single
 * throwing subscriber can't abort dispatch to the others (the behaviour the
 * video path already special-cased, now applied uniformly).
 */
export class Subscribable<T> {
    private readonly listeners = new Set<(value: T) => void>();

    /** @param onError invoked with any error thrown by a listener during emit. */
    constructor(private readonly onError?: (error: unknown) => void) {}

    /** Register a listener; returns an unsubscribe function. */
    subscribe(listener: (value: T) => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    /** Deliver a value to every listener, isolating individual failures. */
    emit(value: T): void {
        this.listeners.forEach((listener) => {
            try {
                listener(value);
            } catch (error) {
                this.onError?.(error);
            }
        });
    }

    /** Number of currently-registered listeners. */
    get size(): number {
        return this.listeners.size;
    }
}
