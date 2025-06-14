export declare interface WireOptions {
    write?: (value: number) => Promise<number | string | void>;
    read?: (address: number) => Promise<number | void>;
    reset?: () => void;
}

export declare interface IoLogic {
    read(value: number | string): Promise<number | string | void>;
    write(value: number): Promise<number | void>;
    wire(options: WireOptions): void;
    reset(): void;
}
