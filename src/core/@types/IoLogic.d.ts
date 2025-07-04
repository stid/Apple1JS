export declare interface WireOptions {
    write?: (value: number) => Promise<number | string | void>;
    read?: (address: number) => Promise<number | void>;
    reset?: () => void;
}

// Base interface for common functionality
export declare interface IoLogicBase {
    wire(options: WireOptions): void;
    reset(): void;
}

// Interface for components that only need write capability
export declare interface IoWriter extends IoLogicBase {
    write(value: number): Promise<number | void>;
}

// Interface for components that need both read and write
export declare interface IoLogic extends IoWriter {
    read(value: number | string): Promise<number | string | void>;
}

// Legacy interface - to be removed when all components are updated
export declare interface IoLogicLegacy {
    read(value: number | string): Promise<number | string | void>;
    write(value: number): Promise<number | void>;
    wire(options: WireOptions): void;
    reset(): void;
}
