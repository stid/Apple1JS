import readline from 'readline';
import * as utils from '../core/utils.js';

const BS      = 0xDF;  // Backspace key, arrow left key (B7 High)
const ESC     = 0x9B;  // ESC key (B7 High)

class Keyboard {
    constructor(pia) {
        this.pia = pia;

        readline.emitKeypressEvents(process.stdin);
        process.stdin.setRawMode(true);
        process.stdin.on('keypress', this.onKeyPressed.bind(this));

    }

    keyIn(key) {
        // PA7 is Always ON (+5v) set it no matter what
        this.pia.setDataA(utils.bitSet(key, 7));
        // Keyboard Strobe - raise CA1 on key pressed
        // CA1 raise - PIA will raise CTRL A bit 7
        this.pia.raiseCA1();
    }

    onKeyPressed(str, key) {
        if (key.sequence === '\u0003') {
            process.exit();
        }

        if (key.name =='backspace') {
            this.keyIn(BS);
        } else if (key.name =='escape') {
            this.keyIn(ESC);
        } else {
            this.keyIn(key.sequence.toUpperCase().charCodeAt(0));
        }
    }
}

export default Keyboard;