import readline from 'readline';

class Keyboard {
    constructor(pia) {
        this.pia = pia;
        readline.emitKeypressEvents(process.stdin);
        process.stdin.setRawMode(true);
        process.stdin.on('keypress', this.onKeyPressed.bind(this));

    }

    onKeyPressed(str, key) {
        let tempKBD;

        if (key.sequence === '\u0003') {
            process.exit();
        }

        if (key.name =='backspace') {
            tempKBD=0x5F;
            this.pia.keyIn(tempKBD);
        } else {
            tempKBD = key.sequence;
            this.pia.keyIn(tempKBD.toUpperCase().charCodeAt(0));
        }
    }
}

export default Keyboard;