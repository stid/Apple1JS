const ROM_ADDR       = 0xFF00; // ROM
const RAM_BANK1_ADDR = 0x0000; // RAM
const RAM_BANK2_ADDR = 0xE000; // EXTENDED RAM

const XAML = 0x24;   // Last "opened" location Low
const XAMH = 0x25;   // Last "opened" location High
const STL  = 0x26;   // Store address Low
const STH  = 0x27;   // Store address High
const L    = 0x28;   // Hex value parsing Low
const H    = 0x29;   // Hex value parsing High
const YSAV = 0x2A;   // Used to see if hex value is given
const MODE = 0x2B;   // $00=XAM, $7F=STOR, $AE=BLOCK XAM
const IN   = 0x200;  // Input buffer ($0200,$027F)

const RAM_BANK_1_SIZE = 4096;
const RAM_BANK_2_SIZE = 4096;

const RAM_BANK_1 = new Array(RAM_BANK_1_SIZE);
const RAM_BANK_2 = new Array(RAM_BANK_2_SIZE);

class AddressSpaces {

    constructor(pia, ROM) {
        this.ROM = ROM;
        this.pia = pia;
    }

    bulkLoadRAM(data, ram_bank=0) {
        const bank = ram_bank ? RAM_BANK_2 : RAM_BANK_1;

        // LOAD A PROG
        const prg_addr = data[1] | data[0] << 8;
        for (let i = 0; i < (data.length)-2 ; i++) {
            bank[prg_addr+i] = data[i+2];
        }
    }

    read(address) {
        let val = 0;

        switch (address >> 12) {
            // $0000-$0FFF 4KB Standard RAM
            case 0x0:
                val = RAM_BANK_1[address - RAM_BANK1_ADDR];
                break;

            // $E000-$EFFF 4KB Extended RAM
            case 0xE:
                val = RAM_BANK_2[address - RAM_BANK2_ADDR];
                break;

            // $FF00-$FFFF 256 Bytes ROM
            case 0xF:
                val = this.ROM[address - ROM_ADDR];
                break;

            // $D010-$D013 PIA (6821) [KBD & DSP]
            case 0xD:
                val = this.pia.read(address);
                break;

            // Segmentation Fault. Just return 0
            default:
                val = 0;
                break;
        }
        return val;
    }

    write(address, value) {
        switch (address >> 12) {
            case 0x0:
                RAM_BANK_1[address - RAM_BANK1_ADDR] = value;
                break;
            case 0xE:
                RAM_BANK_2[address - RAM_BANK2_ADDR] = value;
                break;
            case 0xD:
                this.pia.write(address, value);
                break;
        }
    }
}

export default AddressSpaces;