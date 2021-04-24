import readline from 'readline';

const BS = 0xdf; // Backspace key, arrow left key (B7 High)
const ESC = 0x9b; // ESC key (B7 High)
const RESET_CODE = -255;

// KBD b7..b0 are inputs, b6..b0 is ASCII input, b7 is constant high
//     Programmed to respond to low to high KBD strobe
class Keyboard implements IoComponent {
    private wireWrite?: (value: number) => Promise<void>;

    constructor() {
        readline.emitKeypressEvents(process.stdin);

        if (process.stdin.setRawMode) {
            process.stdin.setRawMode(true);
        }
        process.stdin.on('keypress', this.onKeyPressed.bind(this));
    }

    wire({ write }: { write?: (value: number) => Promise<void> }): void {
        this.wireWrite = write;
    }

    // eslint-disable-next-line no-unused-vars
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async read(_address: number): Promise<void> {
        // Not implemented
    }

    // eslint-disable-next-line no-unused-vars
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async write(_address: number): Promise<void> {
        // Not implemented
    }

    reset(): void {
        return;
    }

    onKeyPressed(_str: string, key: { sequence: string; name: string }): void {
        const wireWrite = this.wireWrite;

        // Special Keys
        switch (key.sequence) {
            // EXIT
            case '\u0003': // ctrl-c
                process.exit();
            // eslint-disable-next-line no-fallthrough
            case '\u0012': // ctrl-r
                if (wireWrite) {
                    wireWrite(RESET_CODE);
                }
                return;
        }

        if (wireWrite) {
            // Standard Keys
            switch (key.name) {
                case 'backspace':
                    wireWrite(BS);
                    break;
                case 'escape':
                    wireWrite(ESC);
                    break;
                default:
                    wireWrite(key.sequence.toUpperCase().charCodeAt(0));
            }
        }
    }
}

export default Keyboard;
