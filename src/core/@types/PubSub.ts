export declare type subscribeFunction<T> = (data: T) => void;

export declare interface PubSub<T = unknown> {
    subscribe(subscriber: subscribeFunction<T>): void;
    unsubscribe(subscriber: subscribeFunction<T>): void;
}
