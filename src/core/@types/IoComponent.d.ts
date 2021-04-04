interface IoComponentWireOptions {
    logicWrite?: (value: number) => Promise<number | void>;
    logicRead?: (address: number) => Promise<number>;
}

declare interface IoComponent {
    read(address: number): Promise<number | void>;
    write(value: number | string): Promise<number | void>;
    wire(options: IoComponentWireOptions): void;
    reset(): void;
}
