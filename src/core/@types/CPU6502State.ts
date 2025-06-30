// State type for CPU6502
export interface CPU6502State {
    PC: number;
    A: number;
    X: number;
    Y: number;
    S: number;
    N: boolean;
    Z: boolean;
    C: boolean;
    V: boolean;
    I: boolean;
    D: boolean;
    irq: boolean;
    nmi: boolean;
    cycles: number;
    opcode: number;
    address: number;
    data: number;
}
