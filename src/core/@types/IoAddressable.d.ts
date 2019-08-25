declare interface IoAddressable {
    read(address: number): number;
    write(address: number, value: number): void;
    flash(data: Array<number>): void;
}

declare interface AddressSpaceType {
    addr: [number, number];
    component: IoAddressable;
    name?: string;
}

