/**
 * Publish/Subscribe pattern type definitions
 */

/**
 * Subscriber function type
 */
export type subscribeFunction<T> = (data: T) => void;

/**
 * PubSub interface for event-driven communication
 */
export interface PubSub<T = unknown> {
    subscribe(subscriber: subscribeFunction<T>): void;
    unsubscribe(subscriber: subscribeFunction<T>): void;
}