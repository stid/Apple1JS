import CPU6502 from '../6502.js';
import AddressSpaces from './address_spaces.js';
import PIA from './pia.js';
import Keyboard from './keyboard.js';
import Display from './display.js';

// ROM + Demo Program
import woz_monitor from '../progs/woz_monitor.js';
import anniversary from '../progs/anniversary.js';

// Build Apple1
const display = new Display()
const pia = new PIA(display);
const addressSpaces = new AddressSpaces(pia, woz_monitor);
const cpu = new CPU6502(addressSpaces);
const keyboard = new Keyboard(pia);

addressSpaces.bulkLoadRAM(anniversary)

// START MAIN LOOP
cpu.reset();

function loop() {
    cpu.step();
    setTimeout(loop, 0);
}
loop();