const B7BS = 0xdf; // Backspace key, arrow left key (B7 High)
const B7ESC = 0x9b; // ESC key (B7 High)
const B7CR = 0x8d;
const RESET_CODE = -255;

// KBD b7..b0 are inputs, b6..b0 is ASCII input, b7 is constant high
//     Programmed to respond to low to high KBD strobe
class Keyboard implements IoComponent {
    private wireWrite?: (value: number) => Promise<number | void>;

    wire(conf: { write?: (value: number) => Promise<number | void> }): void {
        this.wireWrite = conf.write;
    }

    reset(): void {
        return;
    }

    async read(_address: number): Promise<void> {
        // Not implemented
    }

    async write(key: string): Promise<number | void> {
        const wireWrite = this.wireWrite;
        let result;
        if (wireWrite) {
            // Standard Keys
            console.log(key);
            switch (key) {
                case 'Tab':
                    result = await wireWrite(RESET_CODE);
                    break;
                case 'Backspace':
                    result = await wireWrite(B7BS);
                    break;
                case 'Escape':
                    result = await wireWrite(B7ESC);
                    break;
                case 'Enter':
                    result = await wireWrite(B7CR);
                    break;
                default: {
                    if (key.length === 1) {
                        result = await wireWrite(key.toUpperCase().charCodeAt(0));
                    }
                }
            }
        }
        return result;
    }
}

export default Keyboard;
