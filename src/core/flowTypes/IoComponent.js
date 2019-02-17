// @flow
export interface IoComponent {
    read(address: number): Promise<number | void>;
    write(value: number): Promise<void>;
}

