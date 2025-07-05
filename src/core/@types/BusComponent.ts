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