// @flow
import type PIA6820 from '../core/PIA6820';
import {type IoComponent} from '../core/flowTypes/IoComponent';
import * as utils from '../core/utils.js';

class DisplayLogic implements IoComponent {
    +pia: PIA6820;

    constructor(pia: PIA6820) {
        this.pia = pia;
    }

    // eslint-disable-next-line no-unused-vars
    async read(address: number) {
        // Not implemented
    }

    async write(char: number) {
        // PA7 is Always ON (+5v) set it no matter what
        this.pia.setDataA(utils.bitSet(char, 7));
        // Keyboard Strobe - raise CA1 on key pressed
        // CA1 raise - PIA will raise CTRL A bit 7
        this.pia.raiseCA1();
    }

}

export default DisplayLogic;