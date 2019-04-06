// @flow
import {type IoComponent} from '../core/flowTypes/IoComponent';
import wait from 'waait';


const BS: number = 0xDF; // Backspace key, arrow left key (B7 High)
const CR: number = 0x8D; // Carriage Return (B7 High)
const ESC: number = 0x9B; // ESC key (B7 High)

const DISPLAY_DELAY = 17;

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

class CRTVideo implements IoComponent {

    async clearScreen() {
        let i: number=0;
        const clearLoop = async () => {
            await wait(DISPLAY_DELAY);
            if (i < 24) {
                console.log('\n');
                i++;
                clearLoop();
            }
        };
        clearLoop();
    }

    // eslint-disable-next-line no-unused-vars
    async read(address: number) {
        // Not implemented
    }

    wire() {
    }

    async write(char: number) {
        // Clear screen
        if ((char & 0x7F) === 12) {
            return this.clearScreen();
        }

        switch (char) {
        case ESC:
            break;
        case CR:
            console.log('\n');
            break;
        //case 0xFF:
        case BS:
            console.log('\b \b');
            break;
        default:
            console.log(String.fromCharCode(char & 0x7F));
            break;
        }

        await wait(DISPLAY_DELAY);
    }
}

export default CRTVideo;