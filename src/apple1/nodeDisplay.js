// @flow
import type PIA6820 from '../core/PIA6820';
import {type IoComponent} from '../core/flowTypes/IoComponent';

const BS: number = 0xDF; // Backspace key, arrow left key (B7 High)
const CR: number = 0x8D; // Carriage Return (B7 High)
const ESC: number = 0x9B; // ESC key (B7 High)

const DISPLAY_DELAY = 20;

class Display implements IoComponent {
    pia: PIA6820;

    constructor(pia: PIA6820) {
        this.pia = pia;
    }

    // eslint-disable-next-line no-unused-vars
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
                process.stdout.write('\n');
                break;
            //case 0xFF:
            case BS:
                process.stdout.write('\b \b');
                break;
            default:
                process.stdout.write(String.fromCharCode(char & 0x7F));
                break;
        }

        // NOTE: WOZ monitor will wait in a loop until DSP b7 is clear and another char
        // is echoed.
        // DISPLAY_DELAY will in fact slow down the effective execution as the
        // flow hold until Display is Ready. As it was in the reality.
        // This is unrelated to the effective CPU speed that was able to compute far more faster
        // then the display video effective speed.
        //
        // ECHO           bit     DSP         .    ;DA bit (B7) cleared yet?
        //                bmi     ECHO             ;No! Wait for display ready
        //                sta     DSP              ;Output character. Sets DA
        //                rts
        //
        setTimeout( () => {
            // Simulate Display UART I/O triggers.
            // Display Clear - CB1 will clear PB7
            this.pia.clearBitDataB(7);
        }, DISPLAY_DELAY);

    }
}

export default Display;