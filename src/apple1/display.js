const BS      = 0xDF;  // Backspace key, arrow left key (B7 High)
const CR      = 0x8D;  // Carriage Return (B7 High)
const ESC     = 0x9B;  // ESC key (B7 High)

class Display {
    constructor(pia) {
        this.pia = pia;
    }

    write(char) {
        // CB2 is wired to PB7 - arise on display busy
        this.pia.setBitDataB(7);

        switch(char) {
            case CR:
                process.stdout.write('\n')
            break;
            //case 0xFF:
            case BS:
                process.stdout.write('\b \b')
            break;
            default:
                process.stdout.write(String.fromCharCode(char & 0x7F));
            break;
        }

        // Display Clear - CB1 will clear PB7
        // Simulate Display UART I/O triggers
        this.pia.clearBitDataB(7);
    }
}

export default Display;