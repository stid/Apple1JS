// @flow
import readline from 'readline';
import type PIA6820 from '../core/PIA6820';
import {type IoComponent} from '../core/flowTypes/IoComponent';

const BS: number     = 0xDF;  // Backspace key, arrow left key (B7 High)
const ESC: number    = 0x9B;  // ESC key (B7 High)


// KBD b7..b0 are inputs, b6..b0 is ASCII input, b7 is constant high
//     Programmed to respond to low to high KBD strobe
class Keyboard implements IoComponent {
    +pia: PIA6820;
    +keyboardLogic: IoComponent;
    onReset: () => void

    constructor(pia: PIA6820, keyboardLogic: IoComponent) {
        this.pia = pia;
        this.keyboardLogic = keyboardLogic;
        readline.emitKeypressEvents(process.stdin);

        // $FlowFixMe
        process.stdin.setRawMode(true);
        process.stdin.on('keypress', this.onKeyPressed.bind(this));
    }

    // eslint-disable-next-line no-unused-vars
    async read(address: number) {
        // Not implemented
    }

    // eslint-disable-next-line no-unused-vars
    async write(address: number) {
        // Not implemented
    }

    wireReset(onReset: () => void) {
        this.onReset = onReset;
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
            this.keyboardLogic.write(BS);
            break;
        case 'escape':
            this.keyboardLogic.write(ESC);
            break;
        default:
            this.keyboardLogic.write(key.sequence.toUpperCase().charCodeAt(0));
        }

    }
}

export default Keyboard;