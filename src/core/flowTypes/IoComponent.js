// @flow
export interface IoComponent {
    read(address: number): number | void;
    write(value: number): void;
}

