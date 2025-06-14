export declare interface WireOptions {
    write?: (value: number) => Promise<number | string | void>;
    read?: (address: number) => Promise<number | void>;
    reset?: () => void;
}

export declare interface IoComponent {
    read(address: number): Promise<number | void>;
    write(value: number | string): Promise<number | string | void>;
    wire(options: WireOptions): void;
    reset(): void;
}
