import type { InspectableArchView } from './InspectableArchView';

export interface IoAddressable {
    read(address: number): number;
    write(address: number, value: number): void;
    flash?(data: Array<number>): void; // Made optional - only needed for ROM/RAM
    /**
     * Optional: Returns a serializable architecture view of the component, suitable for inspectors.
     */
    getInspectable?(): InspectableArchView;
}

export interface BusSpaceType {
    addr: [number, number];
    component: IoAddressable;
    name: string;
}
