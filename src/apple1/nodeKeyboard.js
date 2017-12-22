// @flow
import readline from 'readline';
import * as utils from '../core/utils.js';
import type PIA6820 from '../core/PIA6820';
import {type IoComponent} from '../core/flowTypes/IoComponent';

const BS: number     = 0xDF;  // Backspace key, arrow left key (B7 High)
const ESC: number    = 0x9B;  // ESC key (B7 High)


// KBD b7..b0 are inputs, b6..b0 is ASCII input, b7 is constant high
//     Programmed to respond to low to high KBD strobe
class Keyboard implements IoComponent {
    +pia: PIA6820;
    onReset: () => mixed

    constructor(pia: PIA6820) {
        this.pia = pia;
        readline.emitKeypressEvents(process.stdin);

        // $FlowFixMe
        process.stdin.setRawMode(true);
        process.stdin.on('keypress', this.onKeyPressed.bind(this));
    }

    // eslint-disable-next-line no-unused-vars
    read(address: number) {
        // Not implemented
    }

    wireReset(onReset: () => mixed) {
        this.onReset = onReset;
    }

    write(key: number) {
        // PA7 is Always ON (+5v) set it no matter what
        this.pia.setDataA(utils.bitSet(key, 7));
        // Keyboard Strobe - raise CA1 on key pressed
        // CA1 raise - PIA will raise CTRL A bit 7
        this.pia.raiseCA1();
    }

    onKeyPressed(str: string, key: {sequence: string, name: string}): void {

        // Special Keys
        switch (key.sequence) {
            // EXIT
            case '\u0003': // ctrl-c
                process.exit();
                break;
            // RESET
            case '\u0012':  // ctrl-r
                if (this.onReset) {this.onReset();}
                return;
        }

        // Standard Keys
        switch (key.name) {
            case 'backspace':
                this.write(BS);
                break;
            case 'escape':
                this.write(ESC);
                break;
            default:
                this.write(key.sequence.toUpperCase().charCodeAt(0));
        }

    }
}

export default Keyboard;