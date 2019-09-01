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

const Apple1 = ({ video, keyboard }: { video: IoComponent; keyboard: IoComponent }) => {
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

    // Wire PIA
    const pia: PIA6820 = new PIA6820();
    const keyboardLogic = new KeyboardLogic(pia);
    const displayLogic = new DisplayLogic(pia, video);
    pia.wireIOA(keyboard);
    pia.wireIOB(displayLogic);

    // Map components
    const rom: ROM = new ROM();
    const ramBank1: RAM = new RAM();
    const ramBank2: RAM = new RAM();
    const addressMapping: Array<AddressSpaceType> = [
        { addr: ROM_ADDR, component: rom, name: 'ROM' },
        { addr: RAM_BANK1_ADDR, component: ramBank1, name: 'RAM_BANK_1' },
        { addr: RAM_BANK2_ADDR, component: ramBank2, name: 'RAM_BANK_2' },
        { addr: PIA_ADDR, component: pia, name: 'PIA6820' },
    ];

    rom.flash(wozMonitor);
    ramBank1.flash(anniversary);
    ramBank2.flash(basic);

    const addressSpaces: AddressSpaces = new AddressSpaces(addressMapping);
    const cpu: CPU6502 = new CPU6502(addressSpaces);

    keyboard.wire({
        logicWrite: async value => {
            if (value === RESET_CODE) {
                cpu.reset();
            } else {
                return keyboardLogic.write(value);
            }
        },
    });

    const clock: Clock = new Clock(cpu, MHZ_CPU_SPEED, STEP_CHUNK);
    console.log(`Apple 1 :: ${process.title} :: ${process.version}`);

    clock.toLog();
    addressSpaces.toLog();
    cpu.toLog();

    // START
    cpu.reset();

    (function loop(): void {
        clock.cycle();
        setImmediate(loop);
    })();
};

export default Apple1;
