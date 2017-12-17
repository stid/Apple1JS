// @flow

import CPU6502 from '../core/6502.js';
import PIA6820 from '../core/PIA6820.js';
import Clock from '../core/Clock'
import ROM from '../core/ROM.js';
import RAM from '../core/RAM.js';

import AddressSpaces from '../core/AddressSpaces.js';
import {type AddressSpaceType, type IoAddressable} from '../core/flowTypes/IoAddressable'

import Keyboard from './nodeKeyboard.js';
import Display from './nodeDisplay.js';

// ROM + Demo Program
import woz_monitor from './progs/woz_monitor.js';
import prog from './progs/anniversary.js';
import basic from './progs/basic.js';

const STEP_CHUNK: number = 10;

// $FF00-$FFFF 256 Bytes ROM
const ROM_ADDR: [number, number]        = [0xFF00, 0xFFFF];
// $0000-$0FFF 4KB Standard RAM
const RAM_BANK1_ADDR: [number, number]  = [0x0000, 0x0FFF];
// $E000-$EFFF 4KB Extended RAM
const RAM_BANK2_ADDR: [number, number]  = [0xE000, 0xEFFF];
// $D010-$D013 PIA (6821) [KBD & DSP]
const PIA_ADDR: [number, number]        = [0xD010, 0xD013];

const MHZ_CPU_SPEED: number = 1;

// Wire PIA
const pia: PIA6820 = new PIA6820();
const keyboard: Keyboard = new Keyboard(pia);
const display: Display = new Display(pia);
pia.wireIOA(keyboard);
pia.wireIOB(display);

// Map components
const rom: ROM = new ROM();
const ramBank1: RAM = new RAM();
const ramBank2: RAM = new RAM();
const addressMapping: Array<AddressSpaceType> = [
    { addr: ROM_ADDR, component: rom},
    { addr: RAM_BANK1_ADDR, component: ramBank1},
    { addr: RAM_BANK2_ADDR, component: ramBank2},
    { addr: PIA_ADDR, component: pia},
];
rom.bulkLoad(woz_monitor);
ramBank1.bulkLoad(prog);
ramBank2.bulkLoad(basic);

const addressSpaces: AddressSpaces = new AddressSpaces(addressMapping);


// START MAIN LOOP
const cpu = new CPU6502(addressSpaces);
const clock: Clock = new Clock(cpu, MHZ_CPU_SPEED, STEP_CHUNK);
cpu.reset();

(function loop() {
    clock.cycle();
    setImmediate(loop);
})();
