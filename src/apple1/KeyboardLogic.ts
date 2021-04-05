import PIA6820 from 'core/PIA6820';
import * as utils from 'core/utils';

class KeyboardLogic implements IoLogic {
    private pia: PIA6820;
    private wireReset?: () => void;

    constructor(pia: PIA6820) {
        this.pia = pia;
    }

    async read(_address: number): Promise<void> {
        // Not implemented
        return;
    }

    async write(char: number): Promise<void> {
        // PA7 is Always ON (+5v) set it no matter what
        this.pia.setDataA(utils.bitSet(char, 7));
        // Keyboard Strobe - raise CA1 on key pressed
        // CA1 raise - PIA will raise CTRL A bit 7
        this.pia.setBitCtrA(7);
    }

    wire({ reset }: WireOptions): void {
        this.wireReset = reset;
    }

    reset(): void {
        if (this.wireReset) this.wireReset();
    }
}

export default KeyboardLogic;
