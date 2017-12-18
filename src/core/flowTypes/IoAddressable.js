// @flow
export interface IoAddressable {
    +data: Array<number>;

    read(address: number): number;
    write(address: number, value: number): void;
    bulkLoad(data: Array<number>): void;
}

export type AddressSpaceType = {
    addr: [number, number],
    component: IoAddressable,
    name?: string;
}

