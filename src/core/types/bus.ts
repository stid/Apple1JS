/**
 * Bus-related type definitions for the core emulation system
 */

/**
 * Interface for components that can be mapped to memory addresses
 */
export interface IoAddressable {
    read(address: number): number;
    write(address: number, value: number): void;
    flash?(data: Array<number>): void; // Optional - only needed for ROM/RAM
}

/**
 * Defines a memory-mapped component in the bus address space
 */
export interface BusSpaceType {
    addr: [number, number];
    component: IoAddressable;
    name: string;
}

/**
 * Type definitions for Bus component metadata.
 * These properties are injected by the framework at runtime.
 */
export interface BusComponentMetadata {
    /** Memory address assigned to this component */
    __address?: string;
    /** Human-readable name for the address */
    __addressName?: string;
}

/**
 * Extends a component type with Bus metadata properties.
 */
export type WithBusMetadata<T> = T & BusComponentMetadata;