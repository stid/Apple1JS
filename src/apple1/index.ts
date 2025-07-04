// Emulator state type for save/load
import type { CPU6502State } from '../core/@types/CPU6502State';

export interface RAMBankState {
    id: string;
    state: { data: number[] };
}

export interface PIAState {
    version?: string;
    ora: number;
    orb: number;
    ddra: number;
    ddrb: number;
    cra: number;
    crb: number;
    controlLines: {
        ca1: boolean;
        ca2: boolean;
        cb1: boolean;
        cb2: boolean;
        prevCa1: boolean;
        prevCa2: boolean;
        prevCb1: boolean;
        prevCb2: boolean;
    };
}

export interface VideoState {
    buffer: unknown; // Use VideoBuffer if type is available
    row: number;
    column: number;
    rowShift?: number;
}

export interface EmulatorState {
    ram: RAMBankState[];
    cpu: CPU6502State;
    pia: PIAState;
    video: VideoState;
}
import CPU6502 from '../core/CPU6502';
import PIA6820 from '../core/PIA6820';
import Clock from '../core/Clock';
import ROM from '../core/ROM';
import RAM from '../core/RAM';
import Bus from '../core/Bus';
import KeyboardLogic from './KeyboardLogic';
import DisplayLogic from './DisplayLogic';
import { IInspectableComponent } from '../core/@types/IInspectableComponent';
import { InspectableIoComponent } from '../core/InspectableIoComponent';

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

class Apple1 implements IInspectableComponent {
    /**
     * Save the state of the entire machine (RAM, CPU, PIA, ...).
     */
    saveState(): EmulatorState {
        return {
            ram: this.saveRAMState(),
            cpu: this.cpu.saveState(),
            pia: this.pia.saveState() as PIAState,
            video:
                typeof this.video.getState === 'function'
                    ? (this.video.getState() as VideoState)
                    : (undefined as unknown as VideoState),
        };
    }

    /**
     * Restore the state of the entire machine (RAM, CPU, PIA, ...).
     */
    loadState(state: EmulatorState) {
        if (state.ram) this.loadRAMState(state.ram);
        if (state.cpu) this.cpu.loadState(state.cpu);
        if (state.pia) this.pia.loadState(state.pia);
        if (state.video && typeof this.video.setState === 'function') this.video.setState(state.video);
    }
    /**
     * Save the state of all RAM banks.
     */
    saveRAMState() {
        return [
            { id: this.ramBank1.id, state: this.ramBank1.saveState() },
            { id: this.ramBank2.id, state: this.ramBank2.saveState() },
            // Add more banks here if needed
        ];
    }

    /**
     * Restore the state of all RAM banks.
     */
    loadRAMState(savedStates: { id: string; state: { data: number[] } }[]) {
        savedStates.forEach((saved) => {
            if (saved.id === this.ramBank1.id) {
                this.ramBank1.loadState(saved.state);
            } else if (saved.id === this.ramBank2.id) {
                this.ramBank2.loadState(saved.state);
            }
            // Add more banks here if needed
        });
    }
    id = 'apple1';
    type = 'Apple1';
    get children() {
        // Wrap video and keyboard as inspectable if possible
        const children: IInspectableComponent[] = [
            this.cpu,
            this.bus,
            this.rom,
            this.ramBank1,
            this.ramBank2,
            this.pia,
            this.clock,
        ];
        if (this.video) {
            children.push(new InspectableIoComponent('video', 'IoComponent', this.video));
        }
        if (this.keyboard) {
            children.push(new InspectableIoComponent('keyboard', 'IoComponent', this.keyboard));
        }
        return children;
    }
    getCompositionTree(): IInspectableComponent {
        return this;
    }
    /**
     * Returns a serializable architecture view of the Apple1 and its children, suitable for inspectors.
     */
    getInspectable() {
        // System-level config/state summary for Inspector
        const childrenViews = this.children.map((child) => {
            const view =
                typeof child.getInspectable === 'function'
                    ? child.getInspectable()
                    : { id: child.id, type: child.type };
            return view;
        });
        return {
            id: this.id,
            type: this.type,
            name: 'Apple 1',
            cpuSpeedMHz: MHZ_CPU_SPEED,
            stepIntervalMs: STEP_INTERVAL,
            romAddress: ROM_ADDR.map((v) => '0x' + v.toString(16).toUpperCase()).join(' - '),
            ramBank1Address: RAM_BANK1_ADDR.map((v) => '0x' + v.toString(16).toUpperCase()).join(' - '),
            ramBank2Address: RAM_BANK2_ADDR.map((v) => '0x' + v.toString(16).toUpperCase()).join(' - '),
            piaAddress: PIA_ADDR.map((v) => '0x' + v.toString(16).toUpperCase()).join(' - '),
            components: [
                { id: this.cpu.id, name: this.cpu.name },
                { id: this.bus.id, name: this.bus.name },
                { id: this.rom.id, name: this.rom.name },
                { id: this.ramBank1.id, name: this.ramBank1.name },
                { id: this.ramBank2.id, name: this.ramBank2.name },
                { id: this.pia.id, name: this.pia.name },
                { id: this.clock.id ?? 'clock', name: this.clock.name },
                {
                    id: 'video',
                    name:
                        typeof this.video === 'object' && 'name' in this.video
                            ? (this.video as { name?: string }).name
                            : undefined,
                },
                {
                    id: 'keyboard',
                    name:
                        typeof this.keyboard === 'object' && 'name' in this.keyboard
                            ? (this.keyboard as { name?: string }).name
                            : undefined,
                },
            ],
            children: childrenViews,
        };
    }
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
        this.pia.name = 'Peripheral Interface Adapter (PIA 6820)';
        this.keyboardLogic = new KeyboardLogic(this.pia);
        this.displayLogic = new DisplayLogic(this.pia);
        this.pia.wireIOA(this.keyboardLogic);
        this.pia.wireIOB(this.displayLogic);

        // Map Components to related memory addresses
        this.rom = new ROM();
        this.rom.name = 'Monitor ROM';
        this.rom.id = 'rom';
        this.ramBank1 = new RAM();
        this.ramBank1.name = 'Main RAM (Bank 1)';
        this.ramBank1.id = 'ram1';
        this.ramBank2 = new RAM();
        this.ramBank2.name = 'Extended RAM (Bank 2)';
        this.ramBank2.id = 'ram2';
        // Annotate each component with its address info for inspection
        function annotateAddress(component: unknown, addr: [number, number], name: string) {
            if (typeof component === 'object' && component !== null) {
                (component as { __address?: string }).__address =
                    `${addr[0].toString(16).toUpperCase()}:${addr[1].toString(16).toUpperCase()}`;
                (component as { __addressRange?: [number, number] }).__addressRange = addr;
                (component as { __addressName?: string }).__addressName = name;
            }
        }
        this.busMapping = [
            { addr: ROM_ADDR, component: this.rom, name: 'ROM' },
            { addr: RAM_BANK1_ADDR, component: this.ramBank1, name: 'RAM_BANK_1' },
            // Base Apple 1 was shipped with BANK 1 only.
            // It was possible to add more ram, especially it was needed to execute BASIC
            { addr: RAM_BANK2_ADDR, component: this.ramBank2, name: 'RAM_BANK_2' },
            { addr: PIA_ADDR, component: this.pia, name: 'PIA6820' },
        ];
        // Annotate all bus-mapped components
        this.busMapping.forEach(({ component, addr, name }) => annotateAddress(component, addr, name));

        // LOAD PROGRAMS in ROM/RAM
        this.rom.flash(wozMonitor);
        this.ramBank1.flash(anniversary);
        this.ramBank2.flash(basic);

        // Bound CPU to related Address Spaces
        this.bus = new Bus(this.busMapping);
        this.bus.name = 'System Bus';
        this.cpu = new CPU6502(this.bus);
        this.cpu.name = '6502 CPU';

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
        this.clock.name = 'System Clock';
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
