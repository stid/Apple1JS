import * as utils from '../core/utils.js';

// PIA MAPPING 6821
const KBD_ADDR = 0x0; // Keyb Char - B7 High on keypress
const KBDCR_ADDR = 0x1; // Keyb Status - B7 High on keypress / Low when ready
const DSP_ADDR = 0x2; // DSP Char
const DSPCR_ADDR = 0x3; // DSP Status - B7 Low if VIDEO ready

let KBD = 0;
let KBDCR = 0;
let DSP = 0;
let DSPCR = 0;

class PIA {

    constructor(ioA) {
        this.ioA = ioA;
    }

    keyIn(key) {
        KBD = key;
        KBD = utils.bitSet(KBD, 7);
        KBDCR = utils.bitSet(KBDCR, 7);
    }

    read(address) {
        let val=0;
        // PIA 6821
        switch (address) {

            case KBD_ADDR:
                val = KBD;
                // Char read, clear B7
                KBDCR = utils.bitClear(KBDCR, 7);
                break;

            case KBDCR_ADDR:
                val = KBDCR;
                break;

            case DSP_ADDR:
                val = DSP;
                break;

            case DSPCR_ADDR:
                val = DSPCR;
                break;
        }
        return val;
    }

    write(address, value) {
        switch (address) {

            // Keyboard
            case KBD_ADDR:
                KBD = value;
                break;

            case KBDCR_ADDR:
                KBDCR = value;
                break;

            // Display
            case DSP_ADDR:
                DSP = value;
                this.ioA.write(DSP);
                DSP = utils.bitClear(DSP, 7);
                break;

            case DSPCR_ADDR:
                DSPCR = value;
                break;
        }
    }
}

export default PIA;