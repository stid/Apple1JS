interface IoLogicWireOptions {
    componentWrite?: (value: number) => Promise<void>;
    componentRead?: (address: number) => Promise<number>;
}

declare interface IoLogic {
    read(address: number): Promise<number | void>;
    write(value: number): Promise<void>;
    wire(options: IoLogicWireOptions): void;
}
