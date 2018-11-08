// @flow
import type PIA6820 from '../core/PIA6820';
import {type IoComponent} from '../core/flowTypes/IoComponent';

const BS: number = 0xDF; // Backspace key, arrow left key (B7 High)
const CR: number = 0x8D; // Carriage Return (B7 High)
const ESC: number = 0x9B; // ESC key (B7 High)

const DISPLAY_DELAY = 17;


// DSP b6..b0 are outputs, b7 is input
//     CB2 goes low when data is written, returns high when CB1 goes high
class Display implements IoComponent {
    pia: PIA6820;

    constructor(pia: PIA6820) {
        this.pia = pia;
    }

    // eslint-disable-next-line no-unused-vars
    read(address: number) {
    }

    clearB7(): void {
        // NOTE: WOZ monitor will wait in a loop until DSP b7 is clear and another char
        // was echoed.
        // DISPLAY_DELAY will in fact slow down the effective execution as the
        // flow hold until Display is Ready.
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

    clearScreen(): void {
        let i: number=0;

        const clearLoop = () => {
            setTimeout( () => {
                if (i < 24) {
                    process.stdout.write('\n');
                    i++;
                    clearLoop();
                } else {
                    this.clearB7();
                }
            }, DISPLAY_DELAY);
        };
        clearLoop();
    }

    write(char: number) {
        //console.log(`${(char & 0x7F)}::: `);
        // CB2 is wired to PB7 - arise on display busy
        this.pia.setBitDataB(7);

        // Clear screen
        if ((char & 0x7F) === 12) {
            this.clearScreen();
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

        this.clearB7();
    }
}

export default Display;
