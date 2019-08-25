import wait from 'waait';

const BS = 0xDF; // Backspace key, arrow left key (B7 High)
const CR = 0x8D; // Carriage Return (B7 High)
const ESC = 0x9B; // ESC key (B7 High)

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
        let i = 0;
        const clearLoop = async () => {
            await wait(DISPLAY_DELAY);
            if (i < 24) {
                process.stdout.write('\n');
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
        return;
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

        await wait(DISPLAY_DELAY);
    }
}

export default CRTVideo;