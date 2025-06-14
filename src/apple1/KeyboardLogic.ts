import { IoLogic, WireOptions } from '@/core/@types/IoLogic';
import PIA6820 from '../core/PIA6820';
import * as utils from '../core/utils';

const RESET_CODE = -255;

class KeyboardLogic implements IoLogic {
    private pia: PIA6820;
    private wireResetCallback?: () => void;

    constructor(pia: PIA6820) {
        this.pia = pia;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async read(_address: number): Promise<void> {
        // Not implemented
        return;
    }

    async write(char: number): Promise<void> {
        if (char === RESET_CODE) {
            this.reset();
        } else {
            // PA7 is always ON (+5v), so set it regardless of the input
            this.pia.setDataA(utils.bitSet(char, 7));

            // Keyboard Strobe - raise CA1 on key pressed
            // When CA1 is raised, PIA will raise CTRL A bit 7
            this.pia.setBitCtrA(7);
        }
    }

    wire({ reset }: WireOptions): void {
        this.wireResetCallback = reset;
    }

    reset(): void {
        this.wireResetCallback?.();
    }
}

export default KeyboardLogic;
