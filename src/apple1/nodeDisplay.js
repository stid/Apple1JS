// @flow
import type PIA6820 from '../core/PIA6820'
import {type IoComponent} from '../core/flowTypes/IoComponent'

const BS = 0xDF; // Backspace key, arrow left key (B7 High)
const CR = 0x8D; // Carriage Return (B7 High)
const ESC = 0x9B; // ESC key (B7 High)

const DISPLAY_DELAY = 1;

class Display implements IoComponent {
    pia: PIA6820;

    constructor(pia: PIA6820) {
        this.pia = pia;
    }

    read(address: number) {
    }

    write(char: number) {
        // CB2 is wired to PB7 - arise on display busy
        this.pia.setBitDataB(7);

        if ((char & 0x7F) > 127) {
            this.pia.clearBitDataB(7);
            return;
        }

        switch (char) {
            case ESC:
                break;
            case CR:
                process.stdout.write('\n')
                break;
            //case 0xFF:
            case BS:
                process.stdout.write('\b \b')
                break;
            default:
                process.stdout.write(String.fromCharCode(char & 0x7F));
                break;
        }

        // Display Clear - CB1 will clear PB7
        // Simulate Display UART I/O triggers
        setTimeout( () => {
            this.pia.clearBitDataB(7);
        }, DISPLAY_DELAY);

    }
}

export default Display;