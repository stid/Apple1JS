// @flow

import CPU6502 from '../core/6502.js';
import PIA6820 from '../core/PIA6820.js';
import Clock from '../core/Clock';
import ROM from '../core/ROM.js';
import RAM from '../core/RAM.js';

import AddressSpaces from '../core/AddressSpaces.js';
import {type AddressSpaceType} from '../core/flowTypes/IoAddressable';

import KeyboardLogic from './KeyboardLogic.js';
import Keyboard from './NodeKeyboard.js';
import DisplayLogic from './DisplayLogic.js';
import NodeCRTVideo from './NodeCRTVideo.js';

// ROM + Demo Program
import anniversary from './progs/anniversary.js';
import basic from './progs/basic.js';
import woz_monitor from './progs/woz_monitor.js';

import {isBrowser} from '../core/utils';

const STEP_CHUNK: number = 10;
const MHZ_CPU_SPEED: number = 1;

// $FF00-$FFFF 256 Bytes ROM
const ROM_ADDR: [number, number]        = [0xFF00, 0xFFFF];
// $0000-$0FFF 4KB Standard RAM
const RAM_BANK1_ADDR: [number, number]  = [0x0000, 0x0FFF];
// $E000-$EFFF 4KB Extended RAM
const RAM_BANK2_ADDR: [number, number]  = [0xE000, 0xEFFF];
// $D010-$D013 PIA (6821) [KBD & DSP]
const PIA_ADDR: [number, number]        = [0xD010, 0xD013];

// Wire PIA
const pia: PIA6820 = new PIA6820();
const keyboardLogic = new KeyboardLogic(pia);
const keyboard: Keyboard = new Keyboard(pia, keyboardLogic);
const video: NodeCRTVideo = new NodeCRTVideo();
const display: DisplayLogic = new DisplayLogic(pia, video);
pia.wireIOA(keyboard);
pia.wireIOB(display);

// Map components
const rom: ROM = new ROM();
const ramBank1: RAM = new RAM();
const ramBank2: RAM = new RAM();
const addressMapping: Array<AddressSpaceType> = [
    { addr: ROM_ADDR, component: rom, name:'ROM'},
    { addr: RAM_BANK1_ADDR, component: ramBank1, name:'RAM_BANK_1'},
    { addr: RAM_BANK2_ADDR, component: ramBank2, name:'RAM_BANK_2'},
    { addr: PIA_ADDR, component: pia, name:'PIA6820'},
];

rom.flash(woz_monitor);
ramBank1.flash(anniversary);
ramBank2.flash(basic);

const addressSpaces: AddressSpaces = new AddressSpaces(addressMapping);
const cpu: CPU6502 = new CPU6502(addressSpaces);
keyboard.wireReset(() => cpu.reset());

const clock: Clock = new Clock(cpu, MHZ_CPU_SPEED, STEP_CHUNK);

if (isBrowser()) {
    console.log('Apple 1 :: Browser Mode');
} else {
    console.log(`Apple 1 :: Node: ${process.version} :: ${process.platform}`);
}

clock.toLog();
addressSpaces.toLog();
cpu.toLog();

// START
cpu.reset();

(function loop(): void {
    clock.cycle();

    if (isBrowser()) {
        setTimeout(loop, 0);
    } else {
        setImmediate(loop);
    }
})();
