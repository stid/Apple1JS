// State type for CPU6502
export interface CPU6502State {
    PC: number;
    A: number;
    X: number;
    Y: number;
    S: number;
    N: number;
    Z: number;
    C: number;
    V: number;
    I: number;
    D: number;
    irq: number;
    nmi: number;
    cycles: number;
    opcode: number;
    address: number;
    data: number;
    // Interrupt handling state
    pendingIrq: number;
    pendingNmi: number;
}
