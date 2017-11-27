import readline from 'readline';
import {DATA_A_ADDR} from '../core/PIA6820.js'
import * as utils from '../core/utils.js';

class Keyboard {
    constructor(pia) {
        this.pia = pia;

        readline.emitKeypressEvents(process.stdin);
        process.stdin.setRawMode(true);
        process.stdin.on('keypress', this.onKeyPressed.bind(this));

    }

    keyIn(key) {
        // PA7 is Always ON (+5v) set it no matter what
        this.pia.set(DATA_A_ADDR, utils.bitSet(key, 7));

        // Keyboard Strobe - raise CA1 on key pressed
        // CA1 raise - PIA will raise CTRL A bit 7
        this.pia.raiseCA1();
    }

    onKeyPressed(str, key) {
        let tempKBD;

        if (key.sequence === '\u0003') {
            process.exit();
        }

        if (key.name =='backspace') {
            tempKBD=0x5F;
            this.keyIn(tempKBD);
        } else {
            tempKBD = key.sequence;
            this.keyIn(tempKBD.toUpperCase().charCodeAt(0));
        }
    }
}

export default Keyboard;