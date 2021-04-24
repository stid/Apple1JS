import wait from 'waait';
import * as appleConstants from './const';

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
    async clearScreen(): Promise<void> {
        let i = 0;
        const clearLoop = async () => {
            await wait(appleConstants.DISPLAY_DELAY);
            if (i < 24) {
                process.stdout.write('\n');
                i++;
                clearLoop();
            }
        };
        clearLoop();
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async read(_address: number): Promise<number> {
        return 0;
    }

    wire(): void {
        return;
    }

    reset(): void {
        return;
    }

    async write(char: number): Promise<void> {
        const bitChar = char & appleConstants.B7;

        switch (bitChar) {
            case appleConstants.ESC:
                break;
            case appleConstants.CR:
                process.stdout.write('\n');
                break;
            //case 0xFF:
            case appleConstants.BS:
                process.stdout.write('\b \b');
                break;
            case appleConstants.CLEAR:
                return this.clearScreen();
            default:
                process.stdout.write(String.fromCharCode(bitChar));
                break;
        }

        await wait(appleConstants.DISPLAY_DELAY);
    }
}

export default CRTVideo;
