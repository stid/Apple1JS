import { IInspectableComponent } from './@types/IInspectableComponent';
import { IoComponent } from './@types/IoComponent';
import { subscribeFunction } from './@types/PubSub';
import { loggingService } from '../services/LoggingService';

// Use global performance API
declare const performance: { now(): number };

// PIA Registers - Apple 1 memory mapping
const REG_ORA_DDRA = 0x0;  // $D010 - Output Register A / Data Direction Register A
const REG_CRA = 0x1;       // $D011 - Control Register A
const REG_ORB_DDRB = 0x2;  // $D012 - Output Register B / Data Direction Register B
const REG_CRB = 0x3;       // $D013 - Control Register B

// Control Register bit definitions
const CR_IRQ1 = 7;         // IRQ1 flag (CA1/CB1 active transition occurred)
const CR_IRQ2 = 6;         // IRQ2 flag (CA2/CB2 active transition occurred, if input)
const CR_CA2_CB2_DIR = 5;  // CA2/CB2 direction (0=input, 1=output)
// const CR_CA2_CB2_CTRL = 3; // CA2/CB2 control (2 bits: 3-4) - Reserved for future use
const CR_DDR_ACCESS = 2;   // DDR access control (0=DDR selected, 1=Output Register selected)
// const CR_CA1_CB1_CTRL = 0; // CA1/CB1 control (2 bits: 0-1) - Reserved for future use

/**
 * MC6820/6821 Peripheral Interface Adapter (PIA) emulation.
 * 
 * The PIA provides two 8-bit bidirectional I/O ports (A and B) with handshaking
 * control lines (CA1/CA2, CB1/CB2). In the Apple 1:
 * - Port A is connected to the keyboard (input)
 * - Port B is connected to the display (output)
 * - CA1 is used for keyboard strobe
 * - CB2 is wired to PB7 for display handshaking
 */
class PIA6820 implements IInspectableComponent {
    id = 'pia6820';
    type = 'PIA6820';
    name?: string;

    // Internal registers
    private ora = 0x00;     // Output Register A
    private orb = 0x00;     // Output Register B
    private ddra = 0x00;    // Data Direction Register A (0=input, 1=output)
    private ddrb = 0x00;    // Data Direction Register B
    private cra = 0x00;     // Control Register A
    private crb = 0x00;     // Control Register B

    // Control line states
    private ca1 = false;
    private ca2 = false;
    private cb1 = false;
    private cb2 = false;
    private prevCa1 = false;
    private prevCa2 = false;
    private prevCb1 = false;
    private prevCb2 = false;

    // Hardware-controlled input pins (separate from ORB register)
    private pb7InputState = false; // Display busy/ready status (controlled by display hardware)

    // I/O connections
    private ioA?: IoComponent;
    private ioB?: IoComponent;
    private subscribers: subscribeFunction<number[]>[] = [];

    // Performance monitoring
    private stats = {
        reads: 0,
        writes: 0,
        notificationCount: 0,
        controlLineChanges: 0,
        startTime: performance.now(),
    };

    // Performance optimization properties
    private registerCache: Map<string, number>;
    private pendingNotification: boolean;
    private notificationBatch: Set<string>;

    constructor() {
        // Initialize PIA registers to proper Apple 1 state
        this.ora = 0x00;
        this.orb = 0x00;
        // Apple 1 specific DDR configuration:
        // Port A: all inputs (keyboard)
        this.ddra = 0x00;
        // Port B: bits 0-6 outputs (display data), bit 7 input (display status)
        this.ddrb = 0x7F;
        // Set CRA and CRB bit 2 to access Output Registers (not DDR)
        this.cra = 0x04; // Bit 2 = 1 to access ORA
        this.crb = 0x04; // Bit 2 = 1 to access ORB
        
        // Initialize control lines
        this.ca1 = false;
        this.ca2 = false;
        this.cb1 = false;
        this.cb2 = false;
        this.prevCa1 = false;
        this.prevCa2 = false;
        this.prevCb1 = false;
        this.prevCb2 = false;

        // Initialize hardware-controlled input pins
        this.pb7InputState = false; // Display ready (not busy)

        // Initialize performance optimization
        this.registerCache = new Map();
        this.pendingNotification = false;
        this.notificationBatch = new Set();
    }

    get children() {
        const children = [];
        if (this.ioA && typeof this.ioA === 'object' && 'type' in this.ioA && 'id' in this.ioA) {
            children.push(this.ioA as IInspectableComponent);
        }
        if (this.ioB && typeof this.ioB === 'object' && 'type' in this.ioB && 'id' in this.ioB) {
            children.push(this.ioB as IInspectableComponent);
        }
        return children;
    }

    /**
     * Read from PIA register
     */
    read(address: number): number {
        this.stats.reads++;

        if (address < 0 || address > 3) {
            loggingService.warn('PIA6820', `Invalid read address ${address}. Valid range is 0-3.`);
            return 0;
        }

        // Control registers (CRA/CRB) are never cached due to dynamic interrupt flags

        let result: number;
        switch (address) {
            case REG_ORA_DDRA:
                // Clear CA1 interrupt flag when reading port A
                this.cra &= ~(1 << CR_IRQ1);
                // Return DDR or Output Register based on CRA bit 2
                result = (this.cra & (1 << CR_DDR_ACCESS)) ? this.readPortA() : this.ddra;
                break;

            case REG_CRA:
                result = this.cra;
                break;

            case REG_ORB_DDRB:
                // Clear CB1 interrupt flag when reading port B
                this.crb &= ~(1 << CR_IRQ1);
                // Return DDR or Output Register based on CRB bit 2
                result = (this.crb & (1 << CR_DDR_ACCESS)) ? this.readPortB() : this.ddrb;
                break;

            case REG_CRB:
                result = this.crb;
                break;

            default:
                result = 0;
        }

        // Control registers are never cached due to dynamic interrupt flags

        return result;
    }

    /**
     * Write to PIA register
     */
    write(address: number, value: number): void {
        this.stats.writes++;

        if (address < 0 || address > 3) {
            loggingService.warn('PIA6820', `Invalid write address ${address}. Valid range is 0-3.`);
            return;
        }

        // Ensure 8-bit value
        value = value & 0xFF;

        // Track if we need to notify
        let valueChanged = false;

        switch (address) {
            case REG_ORA_DDRA:
                if (this.cra & (1 << CR_DDR_ACCESS)) {
                    // Write to Output Register A
                    // Always update register and trigger I/O, even for same value
                    // (I/O writes are commands, not state changes)
                    this.ora = value;
                    valueChanged = true;
                    this.ioA?.write(value);
                } else {
                    // Write to Data Direction Register A
                    if (this.ddra !== value) {
                        this.ddra = value;
                        valueChanged = true;
                    }
                }
                break;

            case REG_CRA: {
                // Bits 6-7 are read-only interrupt flags
                const newCra = (this.cra & 0xC0) | (value & 0x3F);
                if (this.cra !== newCra) {
                    this.cra = newCra;
                    valueChanged = true;
                    this.updateCA2Output();
                }
                break;
            }

            case REG_ORB_DDRB:
                if (this.crb & (1 << CR_DDR_ACCESS)) {
                    // Write to Output Register B
                    // Always update register and trigger I/O, even for same value
                    // (display writes are commands, not state changes)
                    this.orb = value;
                    valueChanged = true;
                    this.ioB?.write(value);
                } else {
                    // Write to Data Direction Register B
                    if (this.ddrb !== value) {
                        this.ddrb = value;
                        valueChanged = true;
                    }
                }
                break;

            case REG_CRB: {
                // Bits 6-7 are read-only interrupt flags
                const newCrb = (this.crb & 0xC0) | (value & 0x3F);
                if (this.crb !== newCrb) {
                    this.crb = newCrb;
                    valueChanged = true;
                    this.updateCB2Output();
                }
                break;
            }
        }

        // Only notify if value actually changed
        if (valueChanged) {
            this.notificationBatch.add(address.toString());
            this.scheduleNotification();
        }
    }

    /**
     * Set CA1 control line state (keyboard strobe in Apple 1)
     */
    setCA1(state: boolean): void {
        this.stats.controlLineChanges++;
        this.prevCa1 = this.ca1;
        this.ca1 = state;

        if (this.detectCA1Transition()) {
            this.cra |= (1 << CR_IRQ1);
            // Use batched notification to prevent recursion
            this.notificationBatch.add('ca1');
            this.scheduleNotification();
        }
    }

    /**
     * Set CB1 control line state
     */
    setCB1(state: boolean): void {
        this.stats.controlLineChanges++;
        this.prevCb1 = this.cb1;
        this.cb1 = state;

        if (this.detectCB1Transition()) {
            this.crb |= (1 << CR_IRQ1);
            // Use batched notification to prevent recursion
            this.notificationBatch.add('cb1');
            this.scheduleNotification();
        }
    }

    /**
     * Set CA2 control line state (if configured as input)
     */
    setCA2(state: boolean): void {
        if (!(this.cra & (1 << CR_CA2_CB2_DIR))) {
            this.stats.controlLineChanges++;
            this.prevCa2 = this.ca2;
            this.ca2 = state;

            if (this.detectCA2Transition()) {
                this.cra |= (1 << CR_IRQ2);
                // Use batched notification to prevent recursion
                this.notificationBatch.add('ca2');
                this.scheduleNotification();
            }
        }
    }

    /**
     * Set CB2 control line state (if configured as input)
     */
    setCB2(state: boolean): void {
        if (!(this.crb & (1 << CR_CA2_CB2_DIR))) {
            this.stats.controlLineChanges++;
            this.prevCb2 = this.cb2;
            this.cb2 = state;

            if (this.detectCB2Transition()) {
                this.crb |= (1 << CR_IRQ2);
                // Use batched notification to prevent recursion
                this.notificationBatch.add('cb2');
                this.scheduleNotification();
            }
        }
    }

    /**
     * Set PB7 input state (controlled by display hardware in Apple 1)
     * This simulates the display circuit controlling the PB7 line directly
     */
    setPB7DisplayStatus(busy: boolean): void {
        if (this.pb7InputState !== busy) {
            this.pb7InputState = busy;
            // Use batched notification to prevent recursion
            this.notificationBatch.add('pb7');
            this.scheduleNotification();
        }
    }

    /**
     * Get IRQA status (for CPU interrupt handling)
     */
    getIRQA(): boolean {
        const irq1Enable = (this.cra & 0x01) !== 0;
        const irq2Enable = (this.cra & 0x08) !== 0;
        const irq1Active = (this.cra & 0x80) !== 0;
        const irq2Active = (this.cra & 0x40) !== 0;
        
        return (irq1Enable && irq1Active) || (irq2Enable && irq2Active);
    }

    /**
     * Get IRQB status (for CPU interrupt handling)
     */
    getIRQB(): boolean {
        const irq1Enable = (this.crb & 0x01) !== 0;
        const irq2Enable = (this.crb & 0x08) !== 0;
        const irq1Active = (this.crb & 0x80) !== 0;
        const irq2Active = (this.crb & 0x40) !== 0;
        
        return (irq1Enable && irq1Active) || (irq2Enable && irq2Active);
    }

    /**
     * Reset PIA to initial state
     */
    reset(): void {
        this.ora = 0x00;
        this.orb = 0x00;
        // Apple 1 specific DDR configuration:
        // Port A: all inputs (keyboard)
        this.ddra = 0x00;
        // Port B: bits 0-6 outputs (display data), bit 7 input (display status)
        this.ddrb = 0x7F;
        // Set CRA and CRB bit 2 to access Output Registers (not DDR)
        this.cra = 0x04; // Bit 2 = 1 to access ORA
        this.crb = 0x04; // Bit 2 = 1 to access ORB
        
        this.ca1 = false;
        this.ca2 = false;
        this.cb1 = false;
        this.cb2 = false;
        this.prevCa1 = false;
        this.prevCa2 = false;
        this.prevCb1 = false;
        this.prevCb2 = false;

        // Reset hardware-controlled input pins
        this.pb7InputState = false; // Display ready (not busy)

        this.stats = {
            reads: 0,
            writes: 0,
            notificationCount: 0,
            controlLineChanges: 0,
            startTime: performance.now(),
        };

        // Clear performance optimization state
        this.registerCache.clear();
        this.notificationBatch.clear();
        this.pendingNotification = false;

        this.notifySubscribers();
    }

    /**
     * Wire I/O components
     */
    wireIOA(ioA: IoComponent): void {
        this.ioA = ioA;
    }

    wireIOB(ioB: IoComponent): void {
        this.ioB = ioB;
    }

    /**
     * Subscribe to PIA state changes
     */
    subscribe(subFunc: subscribeFunction<number[]>): void {
        this.subscribers.push(subFunc);
        subFunc(this.getCurrentState());
    }

    unsubscribe(subFunc: subscribeFunction<number[]>): void {
        this.subscribers = this.subscribers.filter((sub) => sub !== subFunc);
    }

    /**
     * Save PIA state
     */
    saveState(): object {
        return {
            version: '2.0', // File format version for future compatibility
            // Core registers
            ora: this.ora,
            orb: this.orb,
            ddra: this.ddra,
            ddrb: this.ddrb,
            cra: this.cra,
            crb: this.crb,
            // Control lines
            controlLines: {
                ca1: this.ca1,
                ca2: this.ca2,
                cb1: this.cb1,
                cb2: this.cb2,
                prevCa1: this.prevCa1,
                prevCa2: this.prevCa2,
                prevCb1: this.prevCb1,
                prevCb2: this.prevCb2,
            },
            // Hardware-controlled input pins
            pb7InputState: this.pb7InputState,
        };
    }

    /**
     * Load PIA state
     */
    loadState(state: { 
        version?: string;
        ora: number; 
        orb: number; 
        ddra: number; 
        ddrb: number; 
        cra: number; 
        crb: number; 
        controlLines: { 
            ca1: boolean; ca2: boolean; cb1: boolean; cb2: boolean;
            prevCa1: boolean; prevCa2: boolean; prevCb1: boolean; prevCb2: boolean; 
        };
        pb7InputState?: boolean;
    }): void {
        const version = state.version || '2.0';
        
        if (version < '2.0') {
            throw new Error(`Unsupported PIA save state version: ${version}. Please use a newer save state.`);
        }
        
        // Load v2.0+ format with DDR support
        this.ora = state.ora;
        this.orb = state.orb;
        this.ddra = state.ddra;
        this.ddrb = state.ddrb;
        this.cra = state.cra;
        this.crb = state.crb;

        // Load control lines
        this.ca1 = state.controlLines.ca1;
        this.ca2 = state.controlLines.ca2;
        this.cb1 = state.controlLines.cb1;
        this.cb2 = state.controlLines.cb2;
        this.prevCa1 = state.controlLines.prevCa1;
        this.prevCa2 = state.controlLines.prevCa2;
        this.prevCb1 = state.controlLines.prevCb1;
        this.prevCb2 = state.controlLines.prevCb2;

        // Load hardware-controlled input pins (with default for backward compatibility)
        this.pb7InputState = state.pb7InputState ?? false; // Default to display ready
        
        this.notifySubscribers();
    }

    /**
     * Get inspectable state
     */
    getInspectable() {
        const self = this as unknown as { __address?: string; __addressName?: string };
        const uptime = (performance.now() - this.stats.startTime) / 1000;
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
                    'Port A Data': `0x${this.ora.toString(16).padStart(2, '0').toUpperCase()}`,
                    'Port A DDR': `0x${this.ddra.toString(16).padStart(2, '0').toUpperCase()}`,
                    'Port A Control': `0x${this.cra.toString(16).padStart(2, '0').toUpperCase()}`,
                    'Port B Data': `0x${this.orb.toString(16).padStart(2, '0').toUpperCase()}`,
                    'Port B DDR': `0x${this.ddrb.toString(16).padStart(2, '0').toUpperCase()}`,
                    'Port B Control': `0x${this.crb.toString(16).padStart(2, '0').toUpperCase()}`,
                },
                controlLines: {
                    'CA1 (Kbd Strobe)': this.ca1 ? 'HIGH' : 'LOW',
                    'CA2': this.ca2 ? 'HIGH' : 'LOW',
                    'CB1': this.cb1 ? 'HIGH' : 'LOW',
                    'CB2': this.cb2 ? 'HIGH' : 'LOW',
                },
                interrupts: {
                    'IRQA': this.getIRQA() ? 'ACTIVE' : 'INACTIVE',
                    'IRQB': this.getIRQB() ? 'ACTIVE' : 'INACTIVE',
                },
            },
            stats: {
                reads: this.stats.reads,
                writes: this.stats.writes,
                notifications: this.stats.notificationCount,
                controlLineChanges: this.stats.controlLineChanges,
                opsPerSecond: opsPerSecond.toFixed(2),
                cacheSize: this.registerCache.size,
                cacheHit: this.registerCache.size > 0 ? 'Active' : 'Empty',
            },
        };
    }

    /**
     * Debug output
     */
    toDebug(): { [key: string]: string } {
        const uptime = (performance.now() - this.stats.startTime) / 1000;
        const opsPerSecond = uptime > 0 ? (this.stats.reads + this.stats.writes) / uptime : 0;

        // Lazy evaluation - only format when requested
        const formatHex = (value: number) => value.toString(16).padStart(2, '0').toUpperCase();

        return {
            ORA: formatHex(this.ora),
            CRA: formatHex(this.cra),
            ORB: formatHex(this.orb),
            CRB: formatHex(this.crb),
            CA1: this.ca1 ? '1' : '0',
            CA2: this.ca2 ? '1' : '0',
            CB1: this.cb1 ? '1' : '0',
            CB2: this.cb2 ? '1' : '0',
            IRQA: this.getIRQA() ? '1' : '0',
            IRQB: this.getIRQB() ? '1' : '0',
            OPS_SEC: opsPerSecond.toFixed(0),
            CACHE_SIZE: this.registerCache.size.toString(),
        };
    }

    /**
     * Get current state of control lines (for testing/debugging)
     */
    getControlLines(): { ca1: boolean; ca2: boolean; cb1: boolean; cb2: boolean } {
        return {
            ca1: this.ca1,
            ca2: this.ca2,
            cb1: this.cb1,
            cb2: this.cb2,
        };
    }

    // Private helper methods

    private readPortA(): number {
        // In Apple 1, Port A is keyboard input (all bits are inputs)
        // PA7 is always high (+5V)
        return this.ora | 0x80;
    }

    private readPortB(): number {
        // In Apple 1, Port B is display output (bits 0-6) and status input (bit 7)
        // Output bits (DDR=1) come from ORB
        // Input bits (DDR=0) come from external hardware sources
        let result = this.orb & this.ddrb; // Output bits only
        
        // Bit 7 is special - it's the display ready status controlled by display hardware
        if ((this.ddrb & 0x80) === 0) {
            // Bit 7 is input, read the hardware-controlled state
            result |= this.pb7InputState ? 0x80 : 0x00;
        }
        
        return result;
    }

    private detectCA1Transition(): boolean {
        const edge = (this.cra & 0x02) !== 0; // Bit 1: 0=negative edge, 1=positive edge
        return edge ? (!this.prevCa1 && this.ca1) : (this.prevCa1 && !this.ca1);
    }

    private detectCB1Transition(): boolean {
        const edge = (this.crb & 0x02) !== 0;
        return edge ? (!this.prevCb1 && this.cb1) : (this.prevCb1 && !this.cb1);
    }

    private detectCA2Transition(): boolean {
        const edge = (this.cra & 0x10) !== 0; // Bit 4: edge for CA2 as input
        return edge ? (!this.prevCa2 && this.ca2) : (this.prevCa2 && !this.ca2);
    }

    private detectCB2Transition(): boolean {
        const edge = (this.crb & 0x10) !== 0;
        return edge ? (!this.prevCb2 && this.cb2) : (this.prevCb2 && !this.cb2);
    }

    private updateCA2Output(): void {
        // Update CA2 if configured as output
        if (this.cra & (1 << CR_CA2_CB2_DIR)) {
            // const mode = (this.cra >> 3) & 0x07;
            // TODO: Implement CA2 output modes if needed for full 6820 compliance
        }
    }

    private updateCB2Output(): void {
        // Update CB2 if configured as output  
        if (this.crb & (1 << CR_CA2_CB2_DIR)) {
            // const mode = (this.crb >> 3) & 0x07;
            // TODO: Implement CB2 output modes if needed for full 6820 compliance
        }
    }

    private getCurrentState(): number[] {
        // Legacy format for subscribers
        return [this.ora, this.cra, this.orb, this.crb];
    }

    private notifySubscribers(): void {
        this.stats.notificationCount++;
        this.subscribers.forEach((sub) => sub(this.getCurrentState()));
    }

    /**
     * Batch notification system for multi-bit operations
     */
    private scheduleNotification(): void {
        if (this.pendingNotification) return;
        
        this.pendingNotification = true;
        // Use microtask to batch notifications within the same execution cycle
        globalThis.queueMicrotask(() => {
            this.pendingNotification = false;
            if (this.notificationBatch.size > 0) {
                this.notificationBatch.clear();
                this.notifySubscribers();
            }
        });
    }
}

export default PIA6820;