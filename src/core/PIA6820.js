// @flow
import * as utils from './utils.js';
import {type IoAddressable} from './flowTypes/IoAddressable';
import {type IoComponent} from './flowTypes/IoComponent';

// PIA MAPPING 6821
const DATA_A_ADDR: number = 0x0;
const CRT_A_ADDR: number = 0x1;

const DATA_B_ADDR: number = 0x2;
const CRT_B_ADDR: number = 0x3;

class PIA6820 implements IoAddressable {
    +data: Array<number>;
    ioA: IoComponent;
    ioB: IoComponent;

    constructor() {
        this.data = [0, 0, 0, 0];
    }

    wireIOA(ioA: IoComponent): void {
        this.ioA = ioA;
    }

    wireIOB(ioB: IoComponent): void  {
        this.ioB = ioB;
    }

    // Direct Bits A
    setBitDataA(bit: number): void  {
        this.data[DATA_A_ADDR] = utils.bitSet(this.data[DATA_A_ADDR], bit);
    }

    clearBitDataA(bit: number): void  {
        this.data[DATA_A_ADDR] = utils.bitClear(this.data[DATA_A_ADDR], bit);
    }

    setBitCtrA(bit: number): void  {
        this.data[CRT_A_ADDR] = utils.bitSet(this.data[CRT_A_ADDR], bit);
    }

    clearBitCrtA(bit: number): void  {
        this.data[CRT_A_ADDR] = utils.bitClear(this.data[CRT_A_ADDR], bit);
    }

    // Direct Bits B
    setBitDataB(bit: number): void  {
        this.data[DATA_B_ADDR] = utils.bitSet(this.data[DATA_B_ADDR], bit);
    }

    clearBitDataB(bit: number): void  {
        this.data[DATA_B_ADDR] = utils.bitClear(this.data[DATA_B_ADDR], bit);
    }

    setBitCtrB(bit: number): void  {
        this.data[CRT_A_ADDR] = utils.bitSet(this.data[CRT_A_ADDR], bit);
    }

    clearBitCrtB(bit: number): void  {
        this.data[CRT_B_ADDR] = utils.bitClear(this.data[CRT_B_ADDR], bit);
    }

    // Interrupt CA1
    raiseCA1(): void  {
        this.setBitCtrA(7);
    }

    // Interrupt CB1
    raiseCB1(): void  {
        this.setBitCtrB(7);
    }

    // Wire Actions
    setDataA(value: number): void  {
        this.data[DATA_A_ADDR] = value;
    }

    setDataB(value: number): void  {
        this.data[DATA_B_ADDR] = value;
    }

    // BUS Actions
    read(address: number): number {
        switch(address) {
        case DATA_A_ADDR:
            this.clearBitCrtA(7);
            break;

        case DATA_B_ADDR:
            this.clearBitCrtB(7);
            break;
        }
        return this.data[address];
    }

    write(address: number, value: number): void {
        this.data[address] = value;

        switch(address) {
        case DATA_A_ADDR:
            if (this.ioA) {this.ioA.write(value);}
            break;

        case DATA_B_ADDR:
            if (this.ioB) {this.ioB.write(value);}
            break;
        }
    }

    toLog(): void  {
        console.log(this.data);
    }

    // eslint-disable-next-line no-unused-vars
    flash(data: Array<number>): void {
    }

}

export default PIA6820;