// @flow

export interface IoLogic {
    read(address: number): Promise<number | void>;
    write(value: number): Promise<void>;
    wire({
        componentWrite?: (value: number) => Promise<void>,
        componentRead?: (address: number) => Promise<number>
    }): void;
}

