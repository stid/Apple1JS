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
    /**
     * Optional offset mask for partially-decoded devices.
     *
     * The Apple 1 decodes only enough address lines to place a device, so a
     * chip repeats through the rest of its block — the PIA answers throughout
     * `$D000-$DFFF`, not just at `$D010-$D013`. Widen `addr` to cover the
     * repeat and set the mask to the device's register count minus one; the
     * decoded offset becomes `(address - addr[0]) & mirrorMask`.
     *
     * Omitted means exact decoding (`address - addr[0]`), so existing mappings
     * are unaffected. This keeps mirroring out of the overlap rules that
     * `validate()` enforces.
     */
    mirrorMask?: number;
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
