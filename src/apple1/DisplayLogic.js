// @flow
import type PIA6820 from '../core/PIA6820';
import {type IoComponent} from '../core/flowTypes/IoComponent';

// DSP b6..b0 are outputs, b7 is input
//     CB2 goes low when data is written, returns high when CB1 goes high
class DisplayLogic implements IoComponent {
    +pia: PIA6820;
    +video: IoComponent;

    constructor(pia: PIA6820, video: IoComponent) {
        this.pia = pia;
        this.video = video;
    }

    // eslint-disable-next-line no-unused-vars
    async read(address: number) {
        // Not implemented
    }

    async write(char: number) {
        // CB2 is wired to PB7 - arise on display busy
        this.pia.setBitDataB(7);
        await this.video.write(char);
        this.pia.clearBitDataB(7);
    }
}

export default DisplayLogic;
