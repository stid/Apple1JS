const BS = 0xDF;  // Backspace key, arrow left key (B7 High)
const ESC = 0x9B;  // ESC key (B7 High)
//const RESET_CODE = -255;

// KBD b7..b0 are inputs, b6..b0 is ASCII input, b7 is constant high
//     Programmed to respond to low to high KBD strobe
class Keyboard implements IoComponent {
    logicWrite?: (value: number) => Promise<void>;

    constructor() {
        // eslint-disable-next-line no-undef
        window.addEventListener('keydown', (e: KeyboardEvent) => {
            this.onKeyPressed(e);
        });
    }

    wire(conf: {logicWrite?: (value: number) => Promise<void>}) {
        this.logicWrite=conf.logicWrite;
    }

    // eslint-disable-next-line no-unused-vars
    async read(address: number) {
        // Not implemented
    }

    // eslint-disable-next-line no-unused-vars
    async write(address: number) {
        // Not implemented
    }

    onKeyPressed(event: KeyboardEvent): void {
        const logicWrite = this.logicWrite;
        if (logicWrite) {
            // Standard Keys
            switch (event.key) {
            case 'Backspace':
                logicWrite(BS);
                break;
            case 'Escape':
                logicWrite(ESC);
                break;
            default:
                logicWrite(event.keyCode);
            }
        }
    }
}

export default Keyboard;