import readline from 'readline';

class Keyboard {
    constructor(pia) {
        this.pia = pia;
        readline.emitKeypressEvents(process.stdin);
        process.stdin.setRawMode(true);
        process.stdin.on('keypress', this.onKeyPressed.bind(this));

    }

    onKeyPressed(str, key) {
        if (key.sequence === '\u0003') {
            process.exit();
        }

        let tempKBD = key.sequence;

        switch (tempKBD) {
          case 0xA:
            // Not expected from KEYB
            // Just ignore
            return;
            break;
          case 0x8:
          case 0x7F:
            // BS
            tempKBD = 0x5F;
            break;
        }

        this.pia.keyIn(tempKBD.charCodeAt(0));
    }

}

export default Keyboard;