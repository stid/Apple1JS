// @flow
export interface IoComponent {
    read(address: number): Promise<number | void>;
    write(value: number): Promise<void>;
    wire({
        logicWrite?: (value: number) => Promise<void>,
        logicRead?: (address: number) => Promise<number>
    }): void;
}


