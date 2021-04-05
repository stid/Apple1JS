import * as utils from './utils';

// PIA MAPPING 682
const A_KBD = 0x0; // PIA.A keyboard input
const A_KBDCR = 0x1; // PIA.A keyboard control register
const B_DSP = 0x2; // PIA.B display output register
const B_DSPCR = 0x3; // PIA.B display control register

class PIA6820 implements IoAddressable {
    data: Array<number>;
    ioA?: IoComponent;
    ioB?: IoComponent;

    constructor() {
        this.data = [0, 0, 0, 0];
    }

    reset(): void {
        this.data.fill(0);
        return;
    }

    wireIOA(ioA: IoComponent): void {
        this.ioA = ioA;
    }

    wireIOB(ioB: IoComponent): void {
        this.ioB = ioB;
    }

    // Direct Bits A
    setBitDataA(bit: number): void {
        this.data[A_KBD] = utils.bitSet(this.data[A_KBD], bit);
    }

    clearBitDataA(bit: number): void {
        this.data[A_KBD] = utils.bitClear(this.data[A_KBD], bit);
    }

    setBitCtrA(bit: number): void {
        this.data[A_KBDCR] = utils.bitSet(this.data[A_KBDCR], bit);
    }

    clearBitCrtA(bit: number): void {
        this.data[A_KBDCR] = utils.bitClear(this.data[A_KBDCR], bit);
    }

    // Direct Bits B
    setBitDataB(bit: number): void {
        this.data[B_DSP] = utils.bitSet(this.data[B_DSP], bit);
    }

    clearBitDataB(bit: number): void {
        this.data[B_DSP] = utils.bitClear(this.data[B_DSP], bit);
    }

    setBitCtrB(bit: number): void {
        this.data[A_KBDCR] = utils.bitSet(this.data[A_KBDCR], bit);
    }

    clearBitCrtB(bit: number): void {
        this.data[B_DSPCR] = utils.bitClear(this.data[B_DSPCR], bit);
    }

    // Wire Actions
    setDataA(value: number): void {
        this.data[A_KBD] = value;
    }

    setDataB(value: number): void {
        this.data[B_DSP] = value;
    }

    // BUS Actions
    read(address: number): number {
        switch (address) {
            case A_KBD:
                this.clearBitCrtA(7);
                break;

            case B_DSP:
                this.clearBitCrtB(7);
                break;
        }
        return this.data[address];
    }

    write(address: number, value: number): void {
        this.data[address] = value;

        switch (address) {
            case A_KBD:
                if (this.ioA) {
                    this.ioA.write(value);
                }
                break;

            case B_DSP:
                if (this.ioB) {
                    this.ioB.write(value);
                }
                break;
        }
    }

    toLog(): void {
        console.log(this.data);
    }

    toDebug(): { [key: string]: string } {
        return {
            A_KBD: this.data[0].toString(16).padStart(2, '0').toUpperCase(),
            A_KBDCR: this.data[1].toString(16).padStart(2, '0').toUpperCase(),
            B_DSP: this.data[2].toString(16).padStart(2, '0').toUpperCase(),
            B_DSPCR: this.data[3].toString(16).padStart(2, '0').toUpperCase(),
        };
    }

    flash(_data: Array<number>): void {
        return;
    }
}

export default PIA6820;
