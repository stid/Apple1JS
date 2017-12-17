// @flow
import readline from 'readline';
import * as utils from '../core/utils.js';
import type PIA6820 from '../core/PIA6820'
import {type IoComponent} from '../core/flowTypes/IoComponent'

const BS: number      = 0xDF;  // Backspace key, arrow left key (B7 High)
const ESC: number    = 0x9B;  // ESC key (B7 High)

class Keyboard implements IoComponent {
    +pia: PIA6820;

    constructor(pia: PIA6820) {
        this.pia = pia;

        readline.emitKeypressEvents(process.stdin);
        process.stdin.setRawMode(true);
        process.stdin.on('keypress', this.onKeyPressed.bind(this));

    }

    read(address: number) {
    }

    write(key: number) {
        // PA7 is Always ON (+5v) set it no matter what
        this.pia.setDataA(utils.bitSet(key, 7));
        // Keyboard Strobe - raise CA1 on key pressed
        // CA1 raise - PIA will raise CTRL A bit 7
        this.pia.raiseCA1();
    }

    onKeyPressed(str: any, key: Object) {
        if (key.sequence === '\u0003') {
            process.exit();
        }

        if (key.name =='backspace') {
            this.write(BS);
        } else if (key.name =='escape') {
            this.write(ESC);
        } else {
            this.write(key.sequence.toUpperCase().charCodeAt(0));
        }
    }
}

export default Keyboard;