import CPU6502 from 'core/6502';
import PIA6820 from 'core/PIA6820';
import Clock from 'core/Clock';
import ROM from 'core/ROM';
import RAM from 'core/RAM';

import AddressSpaces from 'core/AddressSpaces';

import KeyboardLogic from './KeyboardLogic';
import DisplayLogic from './DisplayLogic';

// ROM + Demo Program
import anniversary from './progs/anniversary';
import basic from './progs/basic';
import wozMonitor from './progs/woz_monitor';

const RESET_CODE = -255;
const STEP_CHUNK = 100;
const MHZ_CPU_SPEED = 1;

// $FF00-$FFFF 256 Bytes ROM
const ROM_ADDR: [number, number] = [0xff00, 0xffff];
// $0000-$0FFF 4KB Standard RAM
const RAM_BANK1_ADDR: [number, number] = [0x0000, 0x0fff];
// $E000-$EFFF 4KB Extended RAM
const RAM_BANK2_ADDR: [number, number] = [0xe000, 0xefff];
// $D010-$D013 PIA (6821) [KBD & DSP]
const PIA_ADDR: [number, number] = [0xd010, 0xd013];

class Apple1 {
    pia: PIA6820;
    keyboardLogic: KeyboardLogic;
    displayLogic: DisplayLogic;
    video: IoComponent;
    keyboard: IoComponent;
    rom: ROM;
    ramBank1: RAM;
    ramBank2: RAM;
    addressMapping: Array<AddressSpaceType>;
    addressSpaces: AddressSpaces;
    cpu: CPU6502;
    clock: Clock;

    constructor({ video, keyboard }: { video: IoComponent; keyboard: IoComponent }) {
        this.video = video;
        this.keyboard = keyboard;

        // Wire PIA
        this.pia = new PIA6820();
        this.keyboardLogic = new KeyboardLogic(this.pia);
        this.displayLogic = new DisplayLogic(this.pia);
        this.pia.wireIOA(this.keyboardLogic);
        this.pia.wireIOB(this.displayLogic);

        // Map components
        this.rom = new ROM();
        this.ramBank1 = new RAM();
        this.ramBank2 = new RAM();
        this.addressMapping = [
            { addr: ROM_ADDR, component: this.rom, name: 'ROM' },
            { addr: RAM_BANK1_ADDR, component: this.ramBank1, name: 'RAM_BANK_1' },
            { addr: RAM_BANK2_ADDR, component: this.ramBank2, name: 'RAM_BANK_2' },
            { addr: PIA_ADDR, component: this.pia, name: 'PIA6820' },
        ];

        // LOAD PROGRAMS
        this.rom.flash(wozMonitor);
        this.ramBank1.flash(anniversary);
        this.ramBank2.flash(basic);

        // WIRING MORE
        this.addressSpaces = new AddressSpaces(this.addressMapping);
        this.cpu = new CPU6502(this.addressSpaces);

        this.keyboard.wire({
            write: async (value) => {
                if (value === RESET_CODE) {
                    this.pia.reset();
                    this.video.reset();
                    this.cpu.reset();
                } else {
                    return this.keyboardLogic.write(value);
                }
            },
        });

        this.displayLogic.wire({
            write: (value: string | number) => this.video.write(value),
            reset: () => this.video.reset(),
        });

        this.clock = new Clock(this.cpu, MHZ_CPU_SPEED, STEP_CHUNK);
        console.log(`Apple 1`);

        //this.reset();

        this.clock.toLog();
        this.addressSpaces.toLog();
        this.cpu.toLog();
    }

    reset(): void {
        this.cpu.reset();
    }

    loop(): void {
        this.clock.cycle();
        setImmediate(this.loop.bind(this));
    }
}

export default Apple1;
