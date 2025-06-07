export declare type subscribeFunction<T> = (data: T) => void;

export declare interface PubSub {
    subscribe(subscriber: (subscribeFunction) => void): void;
    unsubscribe(subscriber: (subscribeFunction) => void): void;
}
