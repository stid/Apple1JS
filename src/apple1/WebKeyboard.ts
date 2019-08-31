const BS = 0xdf; // Backspace key, arrow left key (B7 High)
const ESC = 0x9b; // ESC key (B7 High)
const CR = 13;
//const RESET_CODE = -255;

// KBD b7..b0 are inputs, b6..b0 is ASCII input, b7 is constant high
//     Programmed to respond to low to high KBD strobe
class Keyboard implements IoComponent {
    private logicWrite?: (value: number) => Promise<void>;

    constructor() {
        window.addEventListener('keydown', (e: KeyboardEvent) => {
            this.write(e.key);
        });
    }

    wire(conf: { logicWrite?: (value: number) => Promise<void> }) {
        this.logicWrite = conf.logicWrite;
    }

    async read(_address: number) {
        // Not implemented
    }

    async write(key: string) {
        const logicWrite = this.logicWrite;
        if (logicWrite) {
            // Standard Keys
            switch (key) {
                case 'Backspace':
                    await logicWrite(BS);
                    break;
                case 'Escape':
                    await logicWrite(ESC);
                    break;
                case 'Enter':
                    await logicWrite(CR);
                    break;
                default: {
                    if (key.length === 1) {
                        await logicWrite(key.toUpperCase().charCodeAt(0));
                    }
                }
            }
        }
    }
}

export default Keyboard;
