const BS      = 0xDF;  // Backspace key, arrow left key (B7 High)
const CR      = 0x8D;  // Carriage Return (B7 High)
const ESC     = 0x9B;  // ESC key (B7 High)

class Display {
    write(char) {
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
    }
}

export default Display;