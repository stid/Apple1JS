import type { InspectableData } from './InspectableTypes';

export interface IoAddressable {
    read(address: number): number;
    write(address: number, value: number): void;
    flash?(data: Array<number>): void; // Made optional - only needed for ROM/RAM
    /**
     * Optional: Returns a standardized view of the component for inspection.
     */
    getInspectable?(): InspectableData;
}

export interface BusSpaceType {
    addr: [number, number];
    component: IoAddressable;
    name: string;
}
