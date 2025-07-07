/**
 * I/O component type definitions
 */

/**
 * Options for wiring I/O components
 */
export interface WireOptions {
    write?: (value: number) => Promise<number | string | void>;
    read?: (address: number) => Promise<number | void>;
    reset?: () => void;
}

/**
 * Base interface for common I/O functionality
 */
export interface IoLogicBase {
    wire(options: WireOptions): void;
    reset(): void;
}

/**
 * Interface for components that only need write capability
 */
export interface IoWriter extends IoLogicBase {
    write(value: number): Promise<number | void>;
}

/**
 * Interface for components that need both read and write
 */
export interface IoLogic extends IoWriter {
    read(value: number | string): Promise<number | string | void>;
}

/**
 * Generic state type for IoComponents that support state save/restore
 */
export type IoComponentState = Record<string, unknown>;

/**
 * Modern IoComponent interface with optional state management
 */
export interface IoComponent<TState = IoComponentState> {
    read?(address: number): Promise<number | void>; // Optional
    write(value: number | string): Promise<number | string | void>;
    wire(options: WireOptions): void;
    reset(): void;
    // Optional: for components that support state save/restore
    getState?(): TState;
    setState?(state: TState): void;
}