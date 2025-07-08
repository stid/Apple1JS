// Emulator state type for save/load
import type { EmulatorState, PIAState, VideoState } from './TSTypes';
import type { IVersionedStatefulComponent, StateValidationResult, StateOptions, StateBase } from '../core/types';
import { StateError } from '../core/types';
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
import { loggingService } from '../services/LoggingService';

// ROM + Demo Program
import anniversary from './progs/anniversary';
import basic from './progs/basic';
import wozMonitor from './progs/woz_monitor';
import { IoComponent } from '@/core/@types/IoComponent';
import { BusSpaceType } from '@/core/@types/IoAddressable';
import { 
    ROM_START, ROM_END, 
    RAM_BANK1_START, RAM_BANK1_END,
    RAM_BANK2_START, RAM_BANK2_END,
    PIA_START, PIA_END 
} from '../core/constants/memory';
import { CPU_SPEED_MHZ, CPU_STEP_INTERVAL_MS } from './constants/system';

const STEP_INTERVAL = CPU_STEP_INTERVAL_MS;
const MHZ_CPU_SPEED = CPU_SPEED_MHZ;

// $FF00-$FFFF 256 Bytes ROM
const ROM_ADDR: [number, number] = [ROM_START, ROM_END];
// $0000-$0FFF 4KB Standard RAM
const RAM_BANK1_ADDR: [number, number] = [RAM_BANK1_START, RAM_BANK1_END];
// $E000-$EFFF 4KB Extended RAM
const RAM_BANK2_ADDR: [number, number] = [RAM_BANK2_START, RAM_BANK2_END];
// $D010-$D013 PIA (6821) [KBD & DSP]
const PIA_ADDR: [number, number] = [PIA_START, PIA_END];

/**
 * Apple1 state interface for serialization/deserialization
 */
interface Apple1State extends StateBase {
    /** System configuration */
    cpuSpeedMHz: number;
    stepIntervalMs: number;
    
    /** Component states - using the new stateful component pattern */
    cpu: ReturnType<CPU6502['saveState']>;
    clock: ReturnType<Clock['saveState']>;
    rom: ReturnType<ROM['saveState']>;
    ramBank1: ReturnType<RAM['saveState']>;
    ramBank2: ReturnType<RAM['saveState']>;
    pia: ReturnType<PIA6820['saveState']>;
    
    /** Video state (if available) */
    video?: VideoState;
    
    /** System identification */
    systemId: string;
}

class Apple1 implements IInspectableComponent, IVersionedStatefulComponent<Apple1State> {
    /** Current state schema version */
    private static readonly STATE_VERSION = '2.0';
    // Keep old methods for backward compatibility but mark as deprecated
    /**
     * @deprecated Use the new saveState() method that returns Apple1State
     */
    saveEmulatorState(): EmulatorState {
        const state: EmulatorState = {
            ram: this.saveRAMState(),
            cpu: this.cpu.saveState(),
            pia: this.pia.saveState() as PIAState,
        };
        
        if (typeof this.video.getState === 'function') {
            state.video = this.video.getState();
        }
        
        return state;
    }

    /**
     * @deprecated Use the new loadState() method that accepts Apple1State
     */
    loadEmulatorState(state: EmulatorState) {
        if (state.ram) this.loadRAMState(state.ram);
        if (state.cpu) this.cpu.loadState(state.cpu);
        if (state.pia) {
            // Convert old PIAState format to new PIA6820State format for migration
            const convertedPIAState = {
                version: state.pia.version || '2.0', // Mark as old version to trigger migration
                ora: state.pia.ora,
                orb: state.pia.orb,
                ddra: state.pia.ddra,
                ddrb: state.pia.ddrb,
                cra: state.pia.cra,
                crb: state.pia.crb,
                controlLines: state.pia.controlLines,
                pb7InputState: false, // Default for old states
                componentId: 'pia6820'
            };
            this.pia.loadState(convertedPIAState);
        }
        if (state.video && typeof this.video.setState === 'function') this.video.setState(state.video);
    }
    /**
     * Save the state of all RAM banks.
     */
    private saveRAMState() {
        return [
            { id: this.ramBank1.id, state: this.ramBank1.saveState() },
            { id: this.ramBank2.id, state: this.ramBank2.saveState() },
            // Add more banks here if needed
        ];
    }

    /**
     * Restore the state of all RAM banks.
     */
    private loadRAMState(savedStates: { id: string; state: { data: number[] } }[]) {
        savedStates.forEach((saved) => {
            // Convert old format to new format for backward compatibility
            const convertedState = {
                version: '1.0', // Mark as old version to trigger migration
                data: saved.state.data,
                size: saved.state.data.length,
                componentId: saved.id
            };

            if (saved.id === this.ramBank1.id) {
                this.ramBank1.loadState(convertedState);
            } else if (saved.id === this.ramBank2.id) {
                this.ramBank2.loadState(convertedState);
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
            children.push(new InspectableIoComponent<VideoState>('video', 'IoComponent', this.video));
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
    video: IoComponent<VideoState>;
    keyboard: IoComponent;
    rom: ROM;
    ramBank1: RAM;
    ramBank2: RAM;
    busMapping: Array<BusSpaceType>;
    bus: Bus;
    cpu: CPU6502;
    clock: Clock;

    constructor({ video, keyboard }: { video: IoComponent<VideoState>; keyboard: IoComponent }) {
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
        loggingService.info('Apple1', 'Apple 1 emulator initialized');

        this.clock.subscribe((steps: number) => this.cpu.performBulkSteps(steps));

        // Debug output - system startup information
        loggingService.info('Apple1', `System Clock: ${JSON.stringify(this.clock.toDebug())}`);
        loggingService.info('Apple1', `Bus: ${JSON.stringify(this.bus.toDebug())}`);
        loggingService.info('Apple1', `CPU: ${JSON.stringify(this.cpu.toDebug())}`);
    }

    reset(): void {
        this.cpu.reset();
    }

    async startLoop(): Promise<void> {
        return this.clock.startLoop();
    }

    ////////////////////////////////////////////////////////////////////////////////
    // State Management Implementation
    ////////////////////////////////////////////////////////////////////////////////

    /**
     * Save the current state of the Apple1 system
     */
    saveState(options?: StateOptions): Apple1State {
        const opts = { includeDebugInfo: false, ...options };
        
        const state: Apple1State = {
            version: Apple1.STATE_VERSION,
            // System configuration
            cpuSpeedMHz: MHZ_CPU_SPEED,
            stepIntervalMs: STEP_INTERVAL,
            // Component states
            cpu: this.cpu.saveState(opts),
            clock: this.clock.saveState(opts),
            rom: this.rom.saveState(opts),
            ramBank1: this.ramBank1.saveState(opts),
            ramBank2: this.ramBank2.saveState(opts),
            pia: this.pia.saveState(opts),
            // System identification
            systemId: this.id,
        };

        // Save video state if available
        if (this.video && typeof this.video.getState === 'function') {
            state.video = this.video.getState();
        }

        if (opts.includeDebugInfo) {
            Object.assign(state, {
                metadata: {
                    timestamp: Date.now(),
                    componentId: 'Apple1',
                    systemType: 'Apple 1 Computer',
                }
            });
        }

        return state;
    }

    /**
     * Restore the Apple1 system from a saved state
     */
    loadState(state: Apple1State, options?: StateOptions): void {
        const opts = { validate: true, migrate: true, ...options };
        
        if (opts.validate) {
            const validation = this.validateState(state);
            if (!validation.valid) {
                throw new StateError(
                    `Invalid Apple1 state: ${validation.errors.join(', ')}`,
                    'Apple1',
                    'load'
                );
            }
        }

        // Handle version migration if needed
        let finalState = state;
        if (opts.migrate && state.version && state.version !== Apple1.STATE_VERSION) {
            finalState = this.migrateState(state, state.version);
        }

        // Stop clock before loading state
        // Get running state from the current clock state
        const currentClockState = this.clock.saveState();
        const wasRunning = currentClockState.running;
        if (wasRunning) {
            this.clock.stopLoop();
        }

        // Load component states
        this.cpu.loadState(finalState.cpu, opts);
        this.clock.loadState(finalState.clock, opts);
        this.rom.loadState(finalState.rom, opts);
        this.ramBank1.loadState(finalState.ramBank1, opts);
        this.ramBank2.loadState(finalState.ramBank2, opts);
        this.pia.loadState(finalState.pia, opts);

        // Load video state if available
        if (finalState.video && this.video && typeof this.video.setState === 'function') {
            this.video.setState(finalState.video);
        }

        // Restart clock if it was running
        if (wasRunning) {
            this.clock.startLoop();
        }
    }

    /**
     * Validate a state object for this component
     */
    validateState(state: unknown): StateValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (typeof state !== 'object' || state === null) {
            errors.push('State must be an object');
            return { valid: false, errors, warnings };
        }

        const s = state as Record<string, unknown>;

        // Required fields validation
        if (typeof s.cpuSpeedMHz !== 'number' || s.cpuSpeedMHz <= 0) {
            errors.push('cpuSpeedMHz must be a positive number');
        }
        if (typeof s.stepIntervalMs !== 'number' || s.stepIntervalMs <= 0) {
            errors.push('stepIntervalMs must be a positive number');
        }
        if (typeof s.systemId !== 'string') {
            errors.push('systemId must be a string');
        }

        // Component state validation
        if (!s.cpu || typeof s.cpu !== 'object') {
            errors.push('cpu state must be an object');
        }
        if (!s.clock || typeof s.clock !== 'object') {
            errors.push('clock state must be an object');
        }
        if (!s.rom || typeof s.rom !== 'object') {
            errors.push('rom state must be an object');
        }
        if (!s.ramBank1 || typeof s.ramBank1 !== 'object') {
            errors.push('ramBank1 state must be an object');
        }
        if (!s.ramBank2 || typeof s.ramBank2 !== 'object') {
            errors.push('ramBank2 state must be an object');
        }
        if (!s.pia || typeof s.pia !== 'object') {
            errors.push('pia state must be an object');
        }

        // Version check
        if (s.version && typeof s.version === 'string') {
            const supportedVersions = this.getSupportedVersions();
            if (s.version !== Apple1.STATE_VERSION && !supportedVersions.includes(s.version)) {
                warnings.push(`State version ${s.version} may require migration`);
            }
        }

        // Optional video state
        if (s.video && typeof s.video !== 'object') {
            errors.push('video state must be an object if present');
        }

        return { valid: errors.length === 0, errors, warnings };
    }

    /**
     * Reset the component to its initial state
     */
    resetState(): void {
        // Reset all components
        this.cpu.resetState();
        this.clock.resetState();
        this.rom.resetState();
        this.ramBank1.resetState();
        this.ramBank2.resetState();
        this.pia.resetState();

        // Reset video if available
        if (this.video && typeof this.video.reset === 'function') {
            this.video.reset();
        }

        // Re-flash ROMs and programs
        this.rom.flash(wozMonitor);
        this.ramBank1.flash(anniversary);
        this.ramBank2.flash(basic);
    }

    /**
     * Get the current schema version for this component's state
     */
    getStateVersion(): string {
        return Apple1.STATE_VERSION;
    }

    /**
     * Migrate state from an older version to the current version
     */
    migrateState(oldState: unknown, fromVersion: string): Apple1State {
        if (typeof oldState !== 'object' || oldState === null) {
            throw new StateError('Cannot migrate null or non-object state', 'Apple1', 'migrate');
        }

        const state = oldState as Record<string, unknown>;

        switch (fromVersion) {
            case '1.0':
                // Version 1.0 -> 2.0 migration
                // Convert from old EmulatorState format to new Apple1State format
                return this.migrateFromV1(state);

            default:
                throw new StateError(
                    `Unsupported Apple1 state version: ${fromVersion}`,
                    'Apple1',
                    'migrate'
                );
        }
    }

    /**
     * Migrate from v1.0 EmulatorState to v2.0 Apple1State
     */
    private migrateFromV1(oldState: Record<string, unknown>): Apple1State {
        // Extract old state components
        const emulatorState = oldState as unknown as EmulatorState;
        
        // Create new state format
        const newState: Apple1State = {
            version: Apple1.STATE_VERSION,
            cpuSpeedMHz: MHZ_CPU_SPEED,
            stepIntervalMs: STEP_INTERVAL,
            cpu: emulatorState.cpu || this.cpu.saveState(),
            clock: this.clock.saveState(), // Clock state wasn't saved in v1
            rom: this.rom.saveState(), // ROM state wasn't saved in v1
            ramBank1: this.ramBank1.saveState(),
            ramBank2: this.ramBank2.saveState(),
            pia: this.pia.saveState(),
            systemId: 'apple1',
        };

        // Migrate RAM states if present
        if (emulatorState.ram && Array.isArray(emulatorState.ram)) {
            emulatorState.ram.forEach((ramState) => {
                if (ramState.id === 'ram1') {
                    // RAM component will handle its own migration
                    newState.ramBank1 = {
                        version: '1.0',
                        data: ramState.state.data,
                        size: ramState.state.data.length,
                        componentId: 'ram1'
                    } as ReturnType<RAM['saveState']>;
                } else if (ramState.id === 'ram2') {
                    newState.ramBank2 = {
                        version: '1.0',
                        data: ramState.state.data,
                        size: ramState.state.data.length,
                        componentId: 'ram2'
                    } as ReturnType<RAM['saveState']>;
                }
            });
        }

        // Migrate PIA state if present
        if (emulatorState.pia) {
            // PIA component will handle its own migration
            newState.pia = {
                version: '2.0',
                ...emulatorState.pia,
                pb7InputState: false,
                componentId: 'pia6820'
            } as ReturnType<PIA6820['saveState']>;
        }

        // Migrate video state if present
        if (emulatorState.video) {
            newState.video = emulatorState.video;
        }

        return newState;
    }

    /**
     * Get list of supported state versions for migration
     */
    getSupportedVersions(): string[] {
        return ['1.0', '2.0'];
    }
}

export default Apple1;
