import CPU6502 from '../core/6502';
import PIA6820 from '../core/PIA6820';
import Clock from '../core/Clock';
import ROM from '../core/ROM';
import RAM from '../core/RAM';

import Bus from '../core/Bus';

import KeyboardLogic from './KeyboardLogic';
import DisplayLogic from './DisplayLogic';

// ROM + Demo Program
import anniversary from './progs/anniversary';
import basic from './progs/basic';
import wozMonitor from './progs/woz_monitor';
import { IoComponent } from '@/core/@types/IoComponent';
import { BusSpaceType } from '@/core/@types/IoAddressable';

const STEP_INTERVAL = 30;
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
    busMapping: Array<BusSpaceType>;
    bus: Bus;
    cpu: CPU6502;
    clock: Clock;

    constructor({ video, keyboard }: { video: IoComponent; keyboard: IoComponent }) {
        // Keyboard & Video are injected from the outside (browser vs nodejs). This make this core
        // implementation agnostic. They just need to conform to IOComponent interfaces.
        this.video = video;
        this.keyboard = keyboard;

        // Create PIA & use it to wire to related IOComponents / Logic
        this.pia = new PIA6820();
        this.keyboardLogic = new KeyboardLogic(this.pia);
        this.displayLogic = new DisplayLogic(this.pia);
        this.pia.wireIOA(this.keyboardLogic);
        this.pia.wireIOB(this.displayLogic);

        // Map Components to related memory addresses
        this.rom = new ROM();
        this.ramBank1 = new RAM();
        this.ramBank2 = new RAM();
        this.busMapping = [
            { addr: ROM_ADDR, component: this.rom, name: 'ROM' },
            { addr: RAM_BANK1_ADDR, component: this.ramBank1, name: 'RAM_BANK_1' },
            // Base Apple 1 was shipped with BANK 1 only.
            // It was possible to add more ram, especially it was needed to execute BASIC
            { addr: RAM_BANK2_ADDR, component: this.ramBank2, name: 'RAM_BANK_2' },
            { addr: PIA_ADDR, component: this.pia, name: 'PIA6820' },
        ];

        // LOAD PROGRAMS in ROM/RAM
        this.rom.flash(wozMonitor);
        this.ramBank1.flash(anniversary);
        this.ramBank2.flash(basic);

        // Bound CPU to related Address Spaces
        this.bus = new Bus(this.busMapping);
        this.cpu = new CPU6502(this.bus);

        // WIRING IO
        this.keyboard.wire({
            // Keyboard --> KeyboardLogic
            // Whatver entered in the keyboard goes straight into the logic
            write: async (value) => this.keyboardLogic.write(value),
        });

        this.keyboardLogic.wire({
            // KeyboardLogic --> Reset
            // Keyboard Reset is Hardware on Apple 1
            // Direct wiring to reset components logic
            reset: () => {
                this.pia.reset();
                this.displayLogic.reset();
                this.cpu.reset();
            },
        });

        this.displayLogic.wire({
            // DisplayLogic --> Video Out
            // Output to video from inner displayLogic
            // write / reset goes straight to video out.
            write: (value: string | number) => this.video.write(value),
            reset: () => this.video.reset(),
        });

        // Create the Clock
        // Clock is bound to the CPU and will step on it + take care of respecting
        // the related cycles per executed instruction type.
        this.clock = new Clock(MHZ_CPU_SPEED, STEP_INTERVAL);
        console.log(`Apple 1`);

        this.clock.subscribe((steps: number) => this.cpu.performBulkSteps(steps));

        // Debug output
        this.clock.toLog();
        this.bus.toLog();
        this.cpu.toLog();
    }

    reset(): void {
        this.cpu.reset();
    }

    async startLoop(): Promise<void> {
        return this.clock.startLoop();
    }
}

export default Apple1;
