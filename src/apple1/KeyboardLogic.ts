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

            // Keyboard Strobe - pulse CA1 on key pressed
            // When CA1 is raised, PIA will raise CTRL A bit 7
            // First ensure CA1 is low
            this.pia.setCA1(false);
            // Then raise it to trigger the edge
            this.pia.setCA1(true);
            // In real hardware, CA1 would go low when key is released
            // For now we'll leave it high until next key press
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
