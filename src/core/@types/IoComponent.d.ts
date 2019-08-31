interface IoComponentWireOptions {
    logicWrite?: (value: number) => Promise<void>;
    logicRead?: (address: number) => Promise<number>;
}

declare interface IoComponent {
    read(address: number): Promise<number | void>;
    write(value: number): Promise<void>;
    wire(options: IoComponentWireOptions): void;
}
