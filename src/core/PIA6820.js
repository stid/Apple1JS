import * as utils from './utils.js';

// PIA MAPPING 6821
export const DATA_A_ADDR = 0x0;
export const CRT_A_ADDR = 0x1;

export const DATA_B_ADDR = 0x2;
export const CRT_B_ADDR = 0x3;

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

    // Direct Bits A
    setBitDataA(bit) {
        this.data[DATA_A_ADDR] = utils.bitSet(this.data[DATA_A_ADDR], bit);
    }

    clearBitDataA(bit) {
        this.data[DATA_A_ADDR] = utils.bitClear(this.data[DATA_A_ADDR], bit);
    }

    setBitCtrA(bit) {
        this.data[CRT_A_ADDR] = utils.bitSet(this.data[CRT_A_ADDR], bit);
    }

    clearBitCrtA(bit) {
        this.data[CRT_A_ADDR] = utils.bitClear(this.data[CRT_A_ADDR], bit);
    }

    // Direct Bits B
    setBitDataB(bit) {
        this.data[DATA_B_ADDR] = utils.bitSet(this.data[DATA_B_ADDR], bit);
    }

    clearBitDataB(bit) {
        this.data[DATA_B_ADDR] = utils.bitClear(this.data[DATA_B_ADDR], bit);
    }

    setBitCtrB(bit) {
        this.data[CRT_A_ADDR] = utils.bitSet(this.data[CRT_A_ADDR], bit);
    }

    clearBitCrtB(bit) {
        this.data[CRT_B_ADDR] = utils.bitClear(this.data[CRT_B_ADDR], bit);
    }

    // Interrupt CA1
    raiseCA1() {
        this.setBitCtrA(7);
    }

    // Interrupt CB1
    raiseCB1() {
        this.setBitCtrB(7);
    }

    // BUS Actions
    set(address, value) {
        this.data[address] = value;
    }

    read(address) {
        switch(address) {
            case DATA_A_ADDR:
            this.clearBitCrtA(7)
            break;

            case DATA_B_ADDR:
            this.clearBitCrtB(7)
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