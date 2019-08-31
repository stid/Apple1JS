import wait from 'waait';
import produce from 'immer';

const BS = 0xdf; // Backspace key, arrow left key (B7 High)
const CR = 0x8d; // Carriage Return (B7 High)
const ESC = 0x9b; // ESC key (B7 High)

const DISPLAY_DELAY = 17;
const NUM_COLUMNS = 40;
const NUM_ROWS = 24;

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

interface VideoOut {
    onChange: (buffer: Array<Array<string>>) => void;
}

type VideoBuffer = Array<Array<string>>;

class CRTVideo implements IoComponent {
    row: number;
    column: number;
    private buffer: VideoBuffer;
    private subscribers: Array<VideoOut>;

    constructor() {
        this.row = 0;
        this.column = 0;
        this.buffer = Array(NUM_ROWS);
        this.subscribers = [];
        this.onClear();
    }

    onClear() {
        this._updateBuffer(draftBuffer => {
            for (let i = 0; i < this.buffer.length; i++) {
                draftBuffer[i] = Array(NUM_COLUMNS).fill('');
            }
        });
    }

    subscribe(videoOut: VideoOut) {
        this.subscribers.push(videoOut);
        videoOut.onChange(this.buffer);
    }

    unsubscribe(videoOut: VideoOut) {
        this.subscribers = this.subscribers.filter(subscriber => subscriber !== videoOut);
    }

    private _notifySubscribers() {
        this.subscribers.forEach(subscriber => subscriber.onChange(this.buffer));
    }

    private _onChar(char: string) {
        this._updateBuffer(draftBuffer => {
            // NEW LINE
            if (char === '\n') {
                this.row += 1;
                this.column = 0;
                // BACKSPACE
            } else if (char === '\b') {
                if (this.column >= 0) {
                    this.column -= 1;
                    draftBuffer[this.row][this.column] = '';
                }
            } else {
                // STANDARD SUPPORTED ASCII
                if (char.charCodeAt(0) >= 32 && char.charCodeAt(0) <= 126) {
                    draftBuffer[this.row][this.column] = char;
                    this.column += 1;
                }
            }

            // End of line
            if (this.column >= NUM_COLUMNS) {
                this.row += 1;
                this.column = 0;
            }

            // End of Screen - shift up
            if (this.row >= NUM_ROWS) {
                draftBuffer.shift();
                draftBuffer.push(Array(NUM_COLUMNS).fill(' '));
                this.row -= 1;
            }
        });
    }

    // eslint-disable-next-line no-unused-vars
    async read(_address: number) {
        // Not implemented
    }

    wire() {
        return;
    }

    async write(char: number) {
        // Clear screen
        if ((char & 0x7f) === 12) {
            return this.onClear();
        }

        switch (char) {
            case ESC:
                break;
            case CR:
                this._onChar('\n');
                break;
            //case 0xFF:
            case BS:
                this._onChar('\b');
                break;
            default:
                this._onChar(String.fromCharCode(char & 0x7f));
                break;
        }
        await wait(DISPLAY_DELAY);
    }

    private _updateBuffer(updateFunction: (draftBuffer: VideoBuffer) => void) {
        const newBuffer = produce(this.buffer, draftBuffer => updateFunction(draftBuffer));
        if (newBuffer !== this.buffer) {
            this.buffer = newBuffer;
            this._notifySubscribers();
        }
    }
}

export default CRTVideo;
