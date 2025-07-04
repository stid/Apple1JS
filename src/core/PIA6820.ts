import { IInspectableComponent } from './@types/IInspectableComponent';
import { IoComponent } from './@types/IoComponent';
import { subscribeFunction } from './@types/PubSub';
import * as utils from './utils';
import { loggingService } from '../services/LoggingService';

// Use global performance API
declare const performance: { now(): number };

const A_KBD = 0x0;
const A_KBDCR = 0x1;
const B_DSP = 0x2;
const B_DSPCR = 0x3;

// Control Register bit definitions
const CR_IRQ1_FLAG = 7;      // IRQ1 flag (CA1/CB1 active transition occurred)
const CR_IRQ2_FLAG = 6;      // IRQ2 flag (CA2/CB2 active transition occurred)
const CR_CA2_CB2_DIR = 5;   // CA2/CB2 direction (0=input, 1=output)
// const CR_CA2_CB2_CTRL = 3;  // CA2/CB2 control bits (2 bits: 3-4) - Reserved for Phase 4
// const CR_DDR_ACCESS = 2;     // DDR access (0=DDR, 1=Output Register) - Reserved for Phase 4  
// const CR_CA1_CB1_CTRL = 0;   // CA1/CB1 control bits (2 bits: 0-1) - Reserved for Phase 4

class PIA6820 implements IInspectableComponent {
    // Performance monitoring
    private stats = {
        reads: 0,
        writes: 0,
        notificationCount: 0,
        bitOperations: 0,
        invalidOperations: 0,
        startTime: performance.now(),
    };

    // Control line states
    private controlLines = {
        ca1: false,
        ca2: false,
        cb1: false,
        cb2: false,
        // Previous states for edge detection
        prevCa1: false,
        prevCa2: false,
        prevCb1: false,
        prevCb2: false,
    };

    /**
     * Returns a serializable copy of the PIA state.
     */
    saveState(): object {
        return {
            data: [...this.data],
            controlLines: { ...this.controlLines },
        };
    }

    /**
     * Restores PIA state from a previously saved state.
     */
    loadState(state: { data: number[]; controlLines?: { 
        ca1: boolean; ca2: boolean; cb1: boolean; cb2: boolean;
        prevCa1: boolean; prevCa2: boolean; prevCb1: boolean; prevCb2: boolean;
    } }): void {
        if (!state || !Array.isArray(state.data) || state.data.length !== this.data.length) {
            throw new Error('Invalid PIA state or size mismatch');
        }
        this.data = [...state.data];
        
        // Restore control lines if present (for backward compatibility)
        if (state.controlLines) {
            this.controlLines = { ...state.controlLines };
        }
        
        // Always clear PB7 (display busy) after restore to avoid stuck display
        this.clearBitDataB(7);
        // Notify all subscribers after restoring state to ensure display logic and others are up to date
        this._notifySubscribers();
    }
    /**
     * Returns a serializable architecture view of the PIA6820 and its children, suitable for inspectors.
     */
    getInspectable() {
        const self = this as unknown as { __address?: string; __addressName?: string };
        const uptime = (performance.now() - this.stats.startTime) / 1000; // seconds
        const opsPerSecond = uptime > 0 ? (this.stats.reads + this.stats.writes) / uptime : 0;
        
        return {
            id: this.id,
            type: this.type,
            name: this.name,
            address: self.__address,
            addressName: self.__addressName,
            children: this.children.map((child) =>
                typeof child.getInspectable === 'function'
                    ? child.getInspectable()
                    : { id: child.id, type: child.type },
            ),
            data: {
                registers: {
                    'Port A Data (KBD)': `0x${this.data[A_KBD].toString(16).padStart(2, '0').toUpperCase()}`,
                    'Port A Control (KBDCR)': `0x${this.data[A_KBDCR].toString(16).padStart(2, '0').toUpperCase()}`,
                    'Port B Data (DSP)': `0x${this.data[B_DSP].toString(16).padStart(2, '0').toUpperCase()}`,
                    'Port B Control (DSPCR)': `0x${this.data[B_DSPCR].toString(16).padStart(2, '0').toUpperCase()}`,
                },
                controlLines: {
                    'CA1 (Keyboard Strobe)': this.controlLines.ca1 ? 'HIGH' : 'LOW',
                    'CA2': this.controlLines.ca2 ? 'HIGH' : 'LOW',
                    'CB1': this.controlLines.cb1 ? 'HIGH' : 'LOW', 
                    'CB2 (Display)': this.controlLines.cb2 ? 'HIGH' : 'LOW',
                },
                controlBits: {
                    'Port A IRQ Flag': utils.bitTest(this.data[A_KBDCR], 7) ? 'SET' : 'CLEAR',
                    'Port B IRQ Flag': utils.bitTest(this.data[B_DSPCR], 7) ? 'SET' : 'CLEAR',
                },
            },
            stats: {
                reads: this.stats.reads,
                writes: this.stats.writes,
                notifications: this.stats.notificationCount,
                bitOps: this.stats.bitOperations,
                invalidOps: this.stats.invalidOperations,
                opsPerSecond: opsPerSecond.toFixed(2),
            },
        };
    }
    id = 'pia6820';
    type = 'PIA6820';
    name?: string;
    get children() {
        const children = [];
        if (
            this.ioA &&
            typeof this.ioA === 'object' &&
            'type' in this.ioA &&
            'id' in this.ioA &&
            typeof this.ioA.id === 'string' &&
            typeof this.ioA.type === 'string'
        ) {
            children.push(this.ioA as import('./@types/IInspectableComponent').IInspectableComponent);
        }
        if (
            this.ioB &&
            typeof this.ioB === 'object' &&
            'type' in this.ioB &&
            'id' in this.ioB &&
            typeof this.ioB.id === 'string' &&
            typeof this.ioB.type === 'string'
        ) {
            children.push(this.ioB as import('./@types/IInspectableComponent').IInspectableComponent);
        }
        return children;
    }
    private data: number[];
    ioA?: IoComponent;
    ioB?: IoComponent;
    private subscribers: subscribeFunction<number[]>[];

    constructor() {
        this.data = [0, 0, 0, 0];
        this.subscribers = [];
    }

    reset(): void {
        this.data.fill(0);
        // Reset performance stats
        this.stats = {
            reads: 0,
            writes: 0,
            notificationCount: 0,
            bitOperations: 0,
            invalidOperations: 0,
            startTime: performance.now(),
        };
        // Reset control lines
        this.controlLines = {
            ca1: false,
            ca2: false,
            cb1: false,
            cb2: false,
            prevCa1: false,
            prevCa2: false,
            prevCb1: false,
            prevCb2: false,
        };
    }

    subscribe(subFunc: subscribeFunction<number[]>): void {
        this.subscribers.push(subFunc);
        subFunc([...this.data]);
    }

    unsubscribe(subFunc: subscribeFunction<number[]>): void {
        this.subscribers = this.subscribers.filter((subItem) => subItem !== subFunc);
    }

    private _notifySubscribers() {
        this.stats.notificationCount++;
        this.subscribers.forEach((subFunc) => subFunc([...this.data]));
    }

    wireIOA(ioA: IoComponent): void {
        this.ioA = ioA;
    }

    wireIOB(ioB: IoComponent): void {
        this.ioB = ioB;
    }

    private updateBitData(reg: number, bit: number, set: boolean): void {
        this.stats.bitOperations++;
        
        // Validate bit number (0-7)
        if (bit < 0 || bit > 7) {
            this.stats.invalidOperations++;
            loggingService.warn('PIA6820', `Invalid bit number ${bit}. Must be 0-7.`);
            return;
        }
        
        // Validate register
        if (reg < 0 || reg > 3) {
            this.stats.invalidOperations++;
            loggingService.warn('PIA6820', `Invalid register ${reg}. Must be 0-3.`);
            return;
        }
        
        this.data[reg] = set ? utils.bitSet(this.data[reg], bit) : utils.bitClear(this.data[reg], bit);
    }

    setBitDataA(bit: number): void {
        this.updateBitData(A_KBD, bit, true);
    }

    clearBitDataA(bit: number): void {
        this.updateBitData(A_KBD, bit, false);
    }

    setBitCtrA(bit: number): void {
        this.updateBitData(A_KBDCR, bit, true);
    }

    clearBitCrtA(bit: number): void {
        this.updateBitData(A_KBDCR, bit, false);
    }

    setBitDataB(bit: number): void {
        this.updateBitData(B_DSP, bit, true);
    }

    clearBitDataB(bit: number): void {
        this.updateBitData(B_DSP, bit, false);
    }

    setBitCtrB(bit: number): void {
        this.updateBitData(B_DSPCR, bit, true);
    }

    clearBitCrtB(bit: number): void {
        this.updateBitData(B_DSPCR, bit, false);
    }

    setDataA(value: number): void {
        this.data[A_KBD] = value;
    }

    setDataB(value: number): void {
        this.data[B_DSP] = value;
    }

    read(address: number): number {
        this.stats.reads++;
        
        // Validate address
        if (address < 0 || address > 3) {
            this.stats.invalidOperations++;
            loggingService.warn('PIA6820', `Invalid read address ${address.toString(16).toUpperCase()}. Valid range is 0-3.`);
            return 0;
        }
        
        if (address === A_KBD) this.clearBitCrtA(7);
        if (address === B_DSP) this.clearBitCrtB(7);
        return this.data[address];
    }

    write(address: number, value: number): void {
        this.stats.writes++;
        
        // Validate address
        if (address < 0 || address > 3) {
            this.stats.invalidOperations++;
            loggingService.warn('PIA6820', `Invalid write address ${address.toString(16).toUpperCase()}. Valid range is 0-3.`);
            return;
        }
        
        // Ensure value is 8-bit
        value = value & 0xFF;
        
        this.data[address] = value;
        this._notifySubscribers();

        const ioComponent = address === A_KBD ? this.ioA : address === B_DSP ? this.ioB : null;
        if (ioComponent) ioComponent.write(value);
    }

    toLog(): void {
        console.log(this.data);
    }

    toDebug(): { [key: string]: string } {
        const uptime = (performance.now() - this.stats.startTime) / 1000;
        const opsPerSecond = uptime > 0 ? (this.stats.reads + this.stats.writes) / uptime : 0;
        
        return {
            A_KBD: this.data[0].toString(16).padStart(2, '0').toUpperCase(),
            A_KBDCR: this.data[1].toString(16).padStart(2, '0').toUpperCase(),
            B_DSP: this.data[2].toString(16).padStart(2, '0').toUpperCase(),
            B_DSPCR: this.data[3].toString(16).padStart(2, '0').toUpperCase(),
            CA1: this.controlLines.ca1 ? '1' : '0',
            CA2: this.controlLines.ca2 ? '1' : '0',
            CB1: this.controlLines.cb1 ? '1' : '0',
            CB2: this.controlLines.cb2 ? '1' : '0',
            READS: this.stats.reads.toLocaleString(),
            WRITES: this.stats.writes.toLocaleString(),
            OPS_SEC: opsPerSecond.toFixed(0),
            NOTIFICATIONS: this.stats.notificationCount.toLocaleString(),
            INVALID_OPS: this.stats.invalidOperations.toString(),
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    flash(_data: Array<number>): void {
        return;
    }

    // Control line methods

    /**
     * Set CA1 control line state. Used for keyboard strobe in Apple 1.
     * @param state - true for high, false for low
     */
    setCA1(state: boolean): void {
        this.controlLines.prevCa1 = this.controlLines.ca1;
        this.controlLines.ca1 = state;
        
        // Check for active edge transition
        if (this.checkCA1Transition()) {
            // Set IRQ1 flag in control register A
            this.setBitCtrA(CR_IRQ1_FLAG);
            this.stats.bitOperations++;
        }
    }

    /**
     * Set CB1 control line state. Not used in Apple 1 but implemented for completeness.
     * @param state - true for high, false for low
     */
    setCB1(state: boolean): void {
        this.controlLines.prevCb1 = this.controlLines.cb1;
        this.controlLines.cb1 = state;
        
        // Check for active edge transition
        if (this.checkCB1Transition()) {
            // Set IRQ1 flag in control register B
            this.setBitCtrB(CR_IRQ1_FLAG);
            this.stats.bitOperations++;
        }
    }

    /**
     * Set CA2 control line state (if configured as input).
     * @param state - true for high, false for low
     */
    setCA2(state: boolean): void {
        // Only update if CA2 is configured as input
        if (!utils.bitTest(this.data[A_KBDCR], CR_CA2_CB2_DIR)) {
            this.controlLines.prevCa2 = this.controlLines.ca2;
            this.controlLines.ca2 = state;
            
            // Check for active edge transition
            if (this.checkCA2Transition()) {
                // Set IRQ2 flag in control register A
                this.setBitCtrA(CR_IRQ2_FLAG);
                this.stats.bitOperations++;
            }
        }
    }

    /**
     * Set CB2 control line state (if configured as input).
     * CB2 is used for display handshaking in Apple 1.
     * @param state - true for high, false for low
     */
    setCB2(state: boolean): void {
        // Only update if CB2 is configured as input
        if (!utils.bitTest(this.data[B_DSPCR], CR_CA2_CB2_DIR)) {
            this.controlLines.prevCb2 = this.controlLines.cb2;
            this.controlLines.cb2 = state;
            
            // Check for active edge transition
            if (this.checkCB2Transition()) {
                // Set IRQ2 flag in control register B
                this.setBitCtrB(CR_IRQ2_FLAG);
                this.stats.bitOperations++;
            }
        }
    }

    /**
     * Get current state of control lines (for debugging/inspection)
     */
    getControlLines(): { ca1: boolean; ca2: boolean; cb1: boolean; cb2: boolean } {
        return {
            ca1: this.controlLines.ca1,
            ca2: this.controlLines.ca2,
            cb1: this.controlLines.cb1,
            cb2: this.controlLines.cb2,
        };
    }

    // Private helper methods for edge detection

    private checkCA1Transition(): boolean {
        const ctrl = this.data[A_KBDCR] & 0x03; // Bits 0-1
        const posEdge = (ctrl & 0x01) !== 0; // Bit 0 determines edge
        
        if (posEdge) {
            return !this.controlLines.prevCa1 && this.controlLines.ca1; // Low to high
        } else {
            return this.controlLines.prevCa1 && !this.controlLines.ca1; // High to low
        }
    }

    private checkCB1Transition(): boolean {
        const ctrl = this.data[B_DSPCR] & 0x03; // Bits 0-1
        const posEdge = (ctrl & 0x01) !== 0; // Bit 0 determines edge
        
        if (posEdge) {
            return !this.controlLines.prevCb1 && this.controlLines.cb1; // Low to high
        } else {
            return this.controlLines.prevCb1 && !this.controlLines.cb1; // High to low
        }
    }

    private checkCA2Transition(): boolean {
        const ctrl = (this.data[A_KBDCR] >> 3) & 0x03; // Bits 3-4
        const posEdge = (ctrl & 0x01) !== 0; // Bit 3 determines edge
        
        if (posEdge) {
            return !this.controlLines.prevCa2 && this.controlLines.ca2; // Low to high
        } else {
            return this.controlLines.prevCa2 && !this.controlLines.ca2; // High to low
        }
    }

    private checkCB2Transition(): boolean {
        const ctrl = (this.data[B_DSPCR] >> 3) & 0x03; // Bits 3-4
        const posEdge = (ctrl & 0x01) !== 0; // Bit 3 determines edge
        
        if (posEdge) {
            return !this.controlLines.prevCb2 && this.controlLines.cb2; // Low to high
        } else {
            return this.controlLines.prevCb2 && !this.controlLines.cb2; // High to low
        }
    }
}

export default PIA6820;
