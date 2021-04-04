import PIA6820 from '../core/PIA6820';
const RESET_CODE = -255;

// DSP b6..b0 are outputs, b7 is input
//     CB2 goes low when data is written, returns high when CB1 goes high
class DisplayLogic implements IoLogic {
    private pia: PIA6820;
    private video: IoComponent;

    constructor(pia: PIA6820, video: IoComponent) {
        this.pia = pia;
        this.video = video;
    }

    // eslint-disable-next-line no-unused-vars
    async read(_address: number): Promise<void> {
        // Not imFplemented
        return;
    }

    async write(char: number): Promise<void> {
        if (char == RESET_CODE) {
            this.video.reset();
            return;
        }
        // CB2 is wired to PB7 - arise on display busy
        this.pia.setBitDataB(7);
        await this.video.write(char);
        this.pia.clearBitDataB(7);
    }

    wire(): void {
        return;
    }

    reset(): void {
        this.video.reset();
    }
}

export default DisplayLogic;
