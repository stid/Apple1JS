import wait from 'waait';
import { WEB_VIDEO_BUFFER_ROW, VideoBuffer } from './TSTypes';
import * as appleConstants from './const';
import { CONFIG } from '../config';
import { IoComponent } from '@/core/@types/IoComponent';
import { PubSub, subscribeFunction } from '@/core/@types/PubSub';

const NUM_COLUMNS = 40;
const NUM_ROWS = 24;

// NOTE: WOZ monitor will wait in a loop until DSP B7 is clear and another char
// was echoed.
// DISPLAY_DELAY will in fact slow down the effective execution as the
// flow is on hold until Display is Ready when printing out.
// This is unrelated to the effective CPU speed that was able to compute far more faster
// then the display video effective speed.
//
// ECHO           bit     DSP         .    ;DA bit (B7) cleared yet?
//                bmi     ECHO             ;No! Wait for display ready
//                sta     DSP              ;Output character. Sets DA
//                rts
//

// On Apple 1 the display logic, including scroll was entirely hardware driven.
// The CPU was free to execute in the meantime. In fact Apple 1 was faster than
// the Apple II in this sense.

export interface VideoOut {
    onChange: (buffer: VideoBuffer, row: number, column: number) => void;
}

export type WebCrtVideoSubFuncVideoType = { buffer: VideoBuffer; row: number; column: number };

function cloneBuffer(buffer: VideoBuffer): VideoBuffer {
    // Deep clone: each row and its data array
    return buffer.map(([rowIdx, rowData]) => [rowIdx, [...rowData]] as [number, string[]]);
}

class CRTVideo implements IoComponent, PubSub {
    row: number;
    column: number;
    private buffer: VideoBuffer;
    subscribers: Array<subscribeFunction<WebCrtVideoSubFuncVideoType>>;
    private rowShift: number;
    private supportBS: boolean;

    constructor() {
        this.row = 0;
        this.column = 0;
        this.rowShift = 0;
        this.supportBS = CONFIG.CRT_SUPPORT_BS;
        this.buffer = Array.from({ length: NUM_ROWS }, (_, i) => [i, Array(NUM_COLUMNS).fill('@')]);
        this.subscribers = [];
    }

    setSupportBS(supportBS: boolean): void {
        this.supportBS = supportBS;
    }

    onClear(): void {
        this.buffer = Array.from({ length: NUM_ROWS }, (_, i) => [i, Array(NUM_COLUMNS).fill(' ')]);
        this._notifySubscribers();
    }

    subscribe(subFunc: subscribeFunction<WebCrtVideoSubFuncVideoType>): void {
        this.subscribers.push(subFunc);
        subFunc({ buffer: this.buffer, row: this.row, column: this.column });
    }

    unsubscribe(subFunc: subscribeFunction<WebCrtVideoSubFuncVideoType>): void {
        this.subscribers = this.subscribers.filter((subItem) => subItem !== subFunc);
    }

    private _notifySubscribers() {
        this.subscribers.forEach((subFunc) => subFunc({ buffer: this.buffer, row: this.row, column: this.column }));
    }

    private _newLine() {
        this.row += 1;
        this.column = 0;
    }

    private _onChar(char: string) {
        this._updateBuffer((draftBuffer) => {
            // NEW LINE
            switch (char) {
                case '\n':
                    this._newLine();
                    break;
                case '\b':
                    if (this.column > 0) {
                        this.column -= 1;
                        draftBuffer[this.row][WEB_VIDEO_BUFFER_ROW.DATA][this.column] = ' ';
                    }
                    break;
                default:
                    if (char.charCodeAt(0) >= 32 && char.charCodeAt(0) <= 126) {
                        draftBuffer[this.row][WEB_VIDEO_BUFFER_ROW.DATA][this.column] = char;
                        this.column += 1;
                    }
                    break;
            }
            // End of line
            if (this.column >= NUM_COLUMNS) {
                this._newLine();
            }
            // End of Screen - shift up
            if (this.row >= NUM_ROWS) {
                this.rowShift += 1;
                draftBuffer.shift();
                draftBuffer.push([this.rowShift + this.row, Array(NUM_COLUMNS).fill(' ')]);
                this.row -= 1;
            }
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async read(_address: number): Promise<void> {
        // Not implemented
    }

    wire(): void {
        return;
    }

    reset(): void {
        this.row = 0;
        this.column = 0;
        this.rowShift = 0;
        this.onClear();
    }

    async write(char: number): Promise<void> {
        const bitChar = char & appleConstants.B7;
        switch (bitChar) {
            case appleConstants.ESC:
                break;
            case appleConstants.CR:
                this._onChar('\n');
                break;
            case appleConstants.BS:
                if (this.supportBS) {
                    this._onChar('\b');
                } else {
                    this._onChar('_');
                }
                break;
            default:
                if (bitChar >= 13) {
                    this._onChar(String.fromCharCode(bitChar));
                }
                break;
            case appleConstants.CLEAR:
                // Not implemented
                break;
        }
        await wait(appleConstants.DISPLAY_DELAY);
    }

    private _updateBuffer(updateFunction: (draftBuffer: VideoBuffer) => void) {
        // Deep clone buffer for immutability
        const draftBuffer = cloneBuffer(this.buffer);
        updateFunction(draftBuffer);
        // Only update if changed (shallow compare)
        let changed = false;
        if (draftBuffer.length !== this.buffer.length) {
            changed = true;
        } else {
            for (let i = 0; i < draftBuffer.length; i++) {
                if (
                    draftBuffer[i][0] !== this.buffer[i][0] ||
                    draftBuffer[i][1].join('') !== this.buffer[i][1].join('')
                ) {
                    changed = true;
                    break;
                }
            }
        }
        if (changed) {
            this.buffer = draftBuffer;
        }
        this._notifySubscribers();
    }
}

export default CRTVideo;
