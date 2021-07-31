declare type subscribeFunction<T> = (data: T) => void;

declare interface PubSub {
    subscribe(subscriber: (subscribeFunction) => void): void;
    unsubscribe(subscriber: (subscribeFunction) => void): void;
}
