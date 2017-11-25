import * as utils from '../core/utils.js';

// PIA MAPPING 6821
export const DATA_A_ADDR = 0x0; // Keyb Char - B7 High on keypress
export const CRT_A_ADDR = 0x1; // Keyb Status - B7 High on keypress / Low when ready

export const DATA_B_ADDR = 0x2; // DSP Char
export const CRT_B_ADDR = 0x3; // DSP Status - B7 Low if VIDEO ready

class PIA6820 {

    constructor(ioA, ioB) {
        this.data = [0, 0, 0, 0]
    }

    wireIOA(ioA) {
        this.ioA = ioA;
    }


    wireIOB(ioB) {
        this.ioB = ioB;
    }

    setBit_A_ADDR(bit) {
        this.data[DATA_A_ADDR] = utils.bitSet(this.data[DATA_A_ADDR], bit);
    }

    clearBitCTR_A(bit) {
        this.data[CRT_A_ADDR] = utils.bitClear(this.data[CRT_A_ADDR], bit);
    }

    setBit_B_ADDR(bit) {
        this.data[DATA_B_ADDR] = utils.bitSet(this.data[DATA_B_ADDR], bit);
    }

    clearBitCTR_B(bit) {
        this.data[CRT_B_ADDR] = utils.bitClear(this.data[CRT_B_ADDR], bit);
    }

    read(address) {
        switch(address) {
            case DATA_A_ADDR:
            if (this.ioA) {this.ioA.read(this.data[address])};
            break;

            case DATA_B_ADDR:
            if (this.ioB) {this.ioB.read(this.data[address])};
            break;
        }
        return this.data[address];
    }

    write(address, value) {
        this.data[address] = value;

        switch(address) {
            case DATA_A_ADDR:
            if (this.ioA) {this.ioA.write(value)};
            break;

            case DATA_B_ADDR:
            if (this.ioB) {this.ioB.write(value)};
            break;
        }
    }
}

export default PIA6820;