import CPU6502 from '../core/6502.js';
import ROM from '../core/ROM.js';
import RAM from '../core/RAM.js';
import AddressSpaces from '../core/address_spaces.js';

import PIA from './PIA.js';
import Keyboard from './shellKeyboard.js';
import Display from './display.js';


// ROM + Demo Program
import woz_monitor from './progs/woz_monitor.js';
import prog from './progs/anniversary.js';
import basic from './progs/basic.js';

// $FF00-$FFFF 256 Bytes ROM
const ROM_ADDR       = [0xFF00, 0xFFFF]; // ROM
// $0000-$0FFF 4KB Standard RAM
const RAM_BANK1_ADDR = [0x0000, 0x0FFF]; // RAM
// $E000-$EFFF 4KB Extended RAM
const RAM_BANK2_ADDR = [0xE000, 0xEFFF]; // EXTENDED RAM
// $D010-$D013 PIA (6821) [KBD & DSP]
const PIA_ADDR = [0xD010, 0xD013]; // PIA 6821 ADDR BASE SPACE


const pia = new PIA(new Display());

const addressMapping = {
    ROM: { addr: ROM_ADDR, instance: new ROM()},
    RAM_A: { addr: RAM_BANK1_ADDR, instance: new RAM()},
    RAM_B: { addr: RAM_BANK2_ADDR, instance: new RAM()},
    PIA: { addr: PIA_ADDR, instance: pia},
}

addressMapping.ROM.instance.bulkLoad(woz_monitor);
addressMapping.RAM_A.instance.bulkLoad(prog);
addressMapping.RAM_B.instance.bulkLoad(basic);

const addressSpaces = new AddressSpaces(addressMapping);
const cpu = new CPU6502(addressSpaces);
const keyboard = new Keyboard(pia);

// START MAIN LOOP
cpu.reset();

function loop() {
    cpu.step();
    setTimeout(loop, 0);
}
loop();