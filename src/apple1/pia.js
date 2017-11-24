import * as utils from '../utils.js';

// PIA MAPPING 6821
const PIA_ADDR = 0xD000; // PIA 6821 ADDR BASE SPACE
const KBD_ADDR = 0xD010; // Keyb Char - B7 High on keypress
const KBDCR_ADDR = 0xD011; // Keyb Status - B7 High on keypress / Low when ready
const DSP_ADDR = 0xD012; // DSP Char
const DSPCR_ADDR = 0xD013; // DSP Status - B7 Low if VIDEO ready

let KBD = 0;
let KBDCR = 0;
let DSP = 0;
let DSPCR = 0;

class PIA {

    constructor(display) {
        this.display = display;
    }

    keyIn(key) {
        KBD = key;
        KBD = utils.bitSet(KBD, 7);
        KBDCR = utils.bitSet(KBDCR, 7);
    }

    read(address) {
        let val;
        // PIA 6821
        switch (address) {

            case KBD_ADDR:
                val = KBD;
                // We'v read the char, clear B7
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

            default:
                val = 0;
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
                this.display.write(DSP);
                DSP = utils.bitClear(DSP, 7);
                break;

            case DSPCR_ADDR:
                DSPCR = value;
                break;
        }
    }
}

export default PIA;