/**
 * 6502 CPU Core Implementation
 * 
 * This is the main CPU class that combines all the modular components.
 */

import type { IClockable, IInspectableComponent, InspectableData, IVersionedStatefulComponent, StateValidationResult, StateOptions } from '../types';
import { StateError } from '../types';
import type Bus from '../Bus';
// Formatters imported through debug module
import CPU6502op from './opcodes';
import type { CPU6502Interface, CPU6502State } from './types';

// Import addressing modes
import * as addressing from './addressing';

// Import instructions
import * as instructions from './instructions';

// Import debug functionality
import * as debug from './debug';

class CPU6502 implements IClockable, IInspectableComponent, IVersionedStatefulComponent<CPU6502State>, CPU6502Interface {
    /**
     * Current state version for the CPU6502 component
     */
    private static readonly STATE_VERSION = '3.0';

    /**
     * Returns a serializable copy of the CPU state.
     */
    saveState(options?: StateOptions): CPU6502State {
        const opts = { includeDebugInfo: false, includeRuntimeState: false, ...options };
        
        const state: CPU6502State = {
            version: CPU6502.STATE_VERSION,
            PC: this.PC,
            A: this.A,
            X: this.X,
            Y: this.Y,
            S: this.S,
            N: this.N,
            Z: this.Z,
            C: this.C,
            V: this.V,
            I: this.I,
            D: this.D,
            irq: this.irq,
            nmi: this.nmi,
            cycles: this.cycles,
            opcode: this.opcode,
            address: this.address,
            data: this.data,
            pendingIrq: this.pendingIrq,
            pendingNmi: this.pendingNmi,
            cycleAccurateMode: this.cycleAccurateMode,
            currentInstructionCycles: this.currentInstructionCycles,
        };

        if (opts.includeDebugInfo) {
            Object.assign(state, {
                metadata: {
                    timestamp: Date.now(),
                    componentId: 'CPU6502',
                    instructionCount: this.instructionCount,
                    enableProfiling: this.enableProfiling
                }
            });
        }

        if (opts.includeRuntimeState) {
            // Include runtime state like execution hooks if needed
            Object.assign(state, {
                metadata: {
                    ...state.metadata,
                    hasExecutionHook: this.executionHook !== undefined
                }
            });
        }

        return state;
    }

    /**
     * Restores CPU state from a previously saved state.
     */
    loadState(state: CPU6502State, options?: StateOptions): void {
        const opts = { validate: true, migrate: true, ...options };
        
        if (opts.validate) {
            const validation = this.validateState(state);
            if (!validation.valid) {
                throw new StateError(
                    `Invalid CPU state: ${validation.errors.join(', ')}`, 
                    'CPU6502', 
                    'load'
                );
            }
        }

        // Handle version migration if needed
        let finalState = state;
        if (opts.migrate && state.version && state.version !== CPU6502.STATE_VERSION) {
            finalState = this.migrateState(state, state.version);
        }

        this.PC = finalState.PC;
        this.A = finalState.A;
        this.X = finalState.X;
        this.Y = finalState.Y;
        this.S = finalState.S;
        // Convert boolean to number for backward compatibility
        this.N = typeof finalState.N === 'boolean' ? (finalState.N ? 1 : 0) : finalState.N;
        this.Z = typeof finalState.Z === 'boolean' ? (finalState.Z ? 1 : 0) : finalState.Z;
        this.C = typeof finalState.C === 'boolean' ? (finalState.C ? 1 : 0) : finalState.C;
        this.V = typeof finalState.V === 'boolean' ? (finalState.V ? 1 : 0) : finalState.V;
        this.I = typeof finalState.I === 'boolean' ? (finalState.I ? 1 : 0) : finalState.I;
        this.D = typeof finalState.D === 'boolean' ? (finalState.D ? 1 : 0) : finalState.D;
        this.irq = typeof finalState.irq === 'boolean' ? (finalState.irq ? 1 : 0) : finalState.irq;
        this.nmi = typeof finalState.nmi === 'boolean' ? (finalState.nmi ? 1 : 0) : finalState.nmi;
        this.cycles = finalState.cycles;
        this.opcode = finalState.opcode;
        this.address = finalState.address;
        this.data = finalState.data;
        // Load interrupt state with backward compatibility
        this.pendingIrq = typeof finalState.pendingIrq === 'boolean' ? (finalState.pendingIrq ? 1 : 0) : finalState.pendingIrq;
        this.pendingNmi = typeof finalState.pendingNmi === 'boolean' ? (finalState.pendingNmi ? 1 : 0) : finalState.pendingNmi;
        // Load cycle-accurate timing state (optional, for backward compatibility)
        this.cycleAccurateMode = finalState.cycleAccurateMode ?? true;
        this.currentInstructionCycles = finalState.currentInstructionCycles ?? 0;

        // Note: markStateClean is optional from state dirty tracking mixin
    }

    getInspectable(): InspectableData {
        return debug.getInspectable(this);
    }

    id = 'cpu6502';
    type = 'CPU6502';
    name?: string;
    get children() {
        return [];
    }
    bus: Bus;
    PC: number;
    A: number;
    X: number;
    Y: number;
    S: number;
    N: number;
    Z: number;
    C: number;
    V: number;
    I: number;
    D: number;
    irq: number;
    nmi: number;
    tmp: number;
    addr: number;
    opcode: number;
    data: number;
    address: number;

    cycles: number;

    // Interrupt state
    pendingIrq: number = 0;
    pendingNmi: number = 0;
    
    // Cached values for performance
    readonly stackBase: number = 0x100;
    
    // Performance monitoring (optional)
    instructionCount: number = 0;
    profileData: Map<number, { count: number; cycles: number }> = new Map();
    enableProfiling: boolean = false;
    
    // Execution hook for debugging (breakpoints, etc)
    private executionHook: ((pc: number) => boolean) | undefined;
    
    // Cycle-accurate timing mode for debugging
    cycleAccurateMode: boolean = false; // Disabled by default to prevent memory leaks
    private busAccesses: Array<{ address: number; type: 'read' | 'write'; value?: number }> = [];
    private currentInstructionCycles: number = 0;
    private static readonly MAX_BUS_ACCESS_HISTORY = 1000; // Limit history to prevent memory leaks

    constructor(bus: Bus) {
        this.bus = bus;

        this.PC = 0; // Program counter
        this.A = 0;
        this.X = 0;
        this.Y = 0;
        this.S = 0; // Registers
        this.N = 0;
        this.Z = 0;
        this.C = 0;
        this.V = 0; // ALU flags
        this.I = 1; // Interrupts disabled after power-on
        this.D = 0; // Other flags

        this.data = 0;
        this.address = 0;

        this.irq = 0;
        this.nmi = 0; // IRQ lines

        this.tmp = 0;
        this.addr = 0; // Temporary registers
        this.opcode = 0; // Current opcode
        this.cycles = 0; // Cycles counter
    }

    ////////////////////////////////////////////////////////////////////////////////
    // CPU control
    ////////////////////////////////////////////////////////////////////////////////

    reset(): void {
        this.A = 0;
        this.X = 0;
        this.Y = 0;
        this.S = 0;
        this.N = 0;
        this.Z = 1;
        this.C = 0;
        this.V = 0;
        this.I = 1; // Interrupts disabled after reset
        this.D = 0;

        this.data = 0;
        this.address = 0;
        
        // Clear interrupt state
        this.irq = 0;
        this.nmi = 0;
        this.pendingIrq = 0;
        this.pendingNmi = 0;

        this.PC = (this.read(0xfffd) << 8) | this.read(0xfffc);
        // Note: markStateClean is optional from state dirty tracking mixin
    }

    /**
     * Validate a CPU state object
     */
    validateState(state: unknown): StateValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!state || typeof state !== 'object') {
            errors.push('State must be an object');
            return { valid: false, errors, warnings };
        }

        const s = state as Record<string, unknown>;

        // Required numeric fields
        const requiredNumbers = ['PC', 'A', 'X', 'Y', 'S', 'cycles', 'opcode', 'address', 'data'];
        for (const field of requiredNumbers) {
            if (typeof s[field] !== 'number') {
                errors.push(`${field} must be a number`);
            } else {
                const value = s[field] as number;
                if (field === 'PC' && (value < 0 || value > 0xFFFF)) {
                    errors.push('PC must be between 0 and 0xFFFF');
                } else if (['A', 'X', 'Y', 'S', 'opcode', 'data'].includes(field) && (value < 0 || value > 0xFF)) {
                    errors.push(`${field} must be between 0 and 0xFF`);
                }
            }
        }

        // Flag fields (can be boolean or number)
        const flags = ['N', 'Z', 'C', 'V', 'I', 'D', 'irq', 'nmi', 'pendingIrq', 'pendingNmi'];
        for (const flag of flags) {
            if (s[flag] !== undefined && typeof s[flag] !== 'number' && typeof s[flag] !== 'boolean') {
                errors.push(`${flag} must be a number or boolean`);
            }
        }

        // Optional boolean fields
        if (s.cycleAccurateMode !== undefined && typeof s.cycleAccurateMode !== 'boolean') {
            errors.push('cycleAccurateMode must be a boolean');
        }

        // Version checking
        if (s.version && typeof s.version !== 'string') {
            warnings.push('version should be a string');
        }

        return { valid: errors.length === 0, errors, warnings };
    }

    /**
     * Reset to initial state (alias for reset for interface compliance)
     */
    resetState(): void {
        this.reset();
    }

    /**
     * Get the current state version
     */
    getStateVersion(): string {
        return CPU6502.STATE_VERSION;
    }

    /**
     * Migrate state from older versions
     */
    migrateState(oldState: unknown, fromVersion: string): CPU6502State {
        let migratedState = { ...(oldState as Record<string, unknown>) };

        // Migration from version 1.0 or 2.0 to 3.0
        if (fromVersion === '1.0' || fromVersion === '2.0') {
            // Add new fields with defaults
            migratedState.cycleAccurateMode = migratedState.cycleAccurateMode ?? true;
            migratedState.currentInstructionCycles = migratedState.currentInstructionCycles ?? 0;
            migratedState.version = CPU6502.STATE_VERSION;
        }

        // Convert boolean flags to numbers if needed (legacy format)
        const flags = ['N', 'Z', 'C', 'V', 'I', 'D', 'irq', 'nmi', 'pendingIrq', 'pendingNmi'];
        for (const flag of flags) {
            if (typeof migratedState[flag] === 'boolean') {
                migratedState[flag] = migratedState[flag] ? 1 : 0;
            }
        }

        return migratedState as unknown as CPU6502State;
    }

    /**
     * Get supported state versions for migration
     */
    getSupportedVersions(): string[] {
        return ['1.0', '2.0', '3.0'];
    }

    performSingleStep(): number {
        const startCycles = this.cycles;
        
        // Initialize cycle-accurate timing if enabled
        if (this.cycleAccurateMode) {
            this.busAccesses = [];
            this.currentInstructionCycles = 0;
        }
        
        // Check execution hook (for breakpoints, etc)
        if (this.executionHook && !this.executionHook(this.PC)) {
            // Hook returned false - halt execution without advancing
            return 0;
        }
        
        // Check for interrupts before executing next instruction
        this.checkInterrupts();
        
        this.opcode = this.read(this.PC++);
        
        // Optional performance profiling
        if (this.enableProfiling) {
            this.instructionCount++;
            const existing = this.profileData.get(this.opcode);
            if (existing) {
                existing.count++;
            } else {
                this.profileData.set(this.opcode, { count: 1, cycles: 0 });
            }
        }
        
        CPU6502op[this.opcode](this);
        
        // Update cycle-accurate timing
        if (this.cycleAccurateMode) {
            this.currentInstructionCycles = this.cycles - startCycles;
        }
        
        // Update cycle profiling
        if (this.enableProfiling) {
            const cyclesUsed = this.cycles - startCycles;
            const profile = this.profileData.get(this.opcode)!;
            profile.cycles += cyclesUsed;
        }
        
        return this.cycles - startCycles;
    }

    performBulkSteps(steps: number): void {
        let currentCycleCount = 0;
        while (currentCycleCount <= steps) {
            const cyclesExecuted = this.performSingleStep();
            // If no cycles were executed (execution hook returned false), stop
            if (cyclesExecuted === 0) {
                break;
            }
            currentCycleCount += cyclesExecuted;
        }
    }

    read(address: number): number {
        this.address = address;
        this.data = this.bus.read(address);
        
        // Track bus access for cycle-accurate timing
        if (this.cycleAccurateMode) {
            this.busAccesses.push({ address, type: 'read', value: this.data });
            // Limit array size to prevent memory leaks
            if (this.busAccesses.length > CPU6502.MAX_BUS_ACCESS_HISTORY) {
                this.busAccesses.shift(); // Remove oldest entry
            }
        }
        
        return this.data;
    }

    write(address: number, value: number): void {
        this.address = address;
        this.data = value;
        this.bus.write(address, value);
        
        // Track bus access for cycle-accurate timing
        if (this.cycleAccurateMode) {
            this.busAccesses.push({ address, type: 'write', value });
            // Limit array size to prevent memory leaks
            if (this.busAccesses.length > CPU6502.MAX_BUS_ACCESS_HISTORY) {
                this.busAccesses.shift(); // Remove oldest entry
            }
        }
    }

    getCompletedCycles(): number {
        return this.cycles;
    }

    /**
     * Enable or disable instruction profiling
     */
    setProfilingEnabled(enabled: boolean): void {
        this.enableProfiling = enabled;
        if (!enabled) {
            this.profileData.clear();
            this.instructionCount = 0;
        }
    }
    
    /**
     * Clear profiling data without disabling profiling
     */
    clearProfilingData(): void {
        this.profileData.clear();
        this.instructionCount = 0;
    }
    
    /**
     * Get performance profiling data
     */
    getProfilingData(): { [opcode: string]: { count: number; cycles: number; avgCycles: number } } {
        return debug.getProfilingData(this.profileData);
    }
    
    /**
     * Get summary performance statistics
     */
    getPerformanceStats(): { instructionCount: number; totalInstructions: number; profilingEnabled: boolean } {
        return debug.getPerformanceStats(this.instructionCount, this.profileData, this.enableProfiling);
    }
    
    /**
     * Enable or disable cycle-accurate timing mode for debugging
     */
    setCycleAccurateMode(enabled: boolean): void {
        this.cycleAccurateMode = enabled;
        if (!enabled) {
            this.busAccesses = [];
        }
    }
    
    /**
     * Get cycle-accurate timing mode status
     */
    getCycleAccurateMode(): boolean {
        return this.cycleAccurateMode;
    }
    
    /**
     * Get detailed bus access history for current instruction (when cycle-accurate mode is enabled)
     */
    getBusAccessHistory(): Array<{ address: number; type: 'read' | 'write'; value?: number }> {
        return [...this.busAccesses];
    }
    
    /**
     * Set execution hook for debugging (e.g., breakpoints)
     * The hook is called before each instruction fetch with the current PC.
     * Return false to halt execution, true to continue.
     */
    setExecutionHook(hook?: (pc: number) => boolean): void {
        this.executionHook = hook ?? undefined;
    }
    
    /**
     * Get current instruction cycle count (when cycle-accurate mode is enabled)
     */
    getCurrentInstructionCycles(): number {
        return this.currentInstructionCycles;
    }

    toDebug(): { [key: string]: string | number | boolean | object } {
        return debug.toDebug(this);
    }

    ////////////////////////////////////////////////////////////////////////////////
    // Addressing modes - call imported functions with this context
    ////////////////////////////////////////////////////////////////////////////////

    izx(): void { addressing.izx.call(this); }
    izy(): void { addressing.izy.call(this); }
    ind(): void { addressing.ind.call(this); }
    zp(): void { addressing.zp.call(this); }
    zpx(): void { addressing.zpx.call(this); }
    zpy(): void { addressing.zpy.call(this); }
    imp(): void { addressing.imp.call(this); }
    imm(): void { addressing.imm.call(this); }
    abs(): void { addressing.abs.call(this); }
    abx(): void { addressing.abx.call(this); }
    aby(): void { addressing.aby.call(this); }
    rel(): void { addressing.rel.call(this); }
    rmw(): void { addressing.rmw.call(this); }
    branch(taken: boolean): void { addressing.branch.call(this, taken); }

    ////////////////////////////////////////////////////////////////////////////////
    // Instructions - call imported functions with this context
    ////////////////////////////////////////////////////////////////////////////////

    adc(): void { instructions.adc.call(this); }
    and(): void { instructions.and.call(this); }
    asl(): void { instructions.asl.call(this); }
    asla(): void { instructions.asla.call(this); }
    bit(): void { instructions.bit.call(this); }
    brk(): void { instructions.brk.call(this); }
    bcc(): void { instructions.bcc.call(this); }
    bcs(): void { instructions.bcs.call(this); }
    beq(): void { instructions.beq.call(this); }
    bne(): void { instructions.bne.call(this); }
    bmi(): void { instructions.bmi.call(this); }
    bpl(): void { instructions.bpl.call(this); }
    bvc(): void { instructions.bvc.call(this); }
    bvs(): void { instructions.bvs.call(this); }
    clc(): void { instructions.clc.call(this); }
    cld(): void { instructions.cld.call(this); }
    cli(): void { instructions.cli.call(this); }
    clv(): void { instructions.clv.call(this); }
    cmp(): void { instructions.cmp.call(this); }
    cpx(): void { instructions.cpx.call(this); }
    cpy(): void { instructions.cpy.call(this); }
    dec(): void { instructions.dec.call(this); }
    dex(): void { instructions.dex.call(this); }
    dey(): void { instructions.dey.call(this); }
    eor(): void { instructions.eor.call(this); }
    inc(): void { instructions.inc.call(this); }
    inx(): void { instructions.inx.call(this); }
    iny(): void { instructions.iny.call(this); }
    jmp(): void { instructions.jmp.call(this); }
    jsr(): void { instructions.jsr.call(this); }
    lda(): void { instructions.lda.call(this); }
    ldx(): void { instructions.ldx.call(this); }
    ldy(): void { instructions.ldy.call(this); }
    ora(): void { instructions.ora.call(this); }
    rol(): void { instructions.rol.call(this); }
    rola(): void { instructions.rola.call(this); }
    ror(): void { instructions.ror.call(this); }
    rora(): void { instructions.rora.call(this); }
    lsr(): void { instructions.lsr.call(this); }
    lsra(): void { instructions.lsra.call(this); }
    nop(): void { instructions.nop.call(this); }
    pha(): void { instructions.pha.call(this); }
    php(): void { instructions.php.call(this); }
    pla(): void { instructions.pla.call(this); }
    plp(): void { instructions.plp.call(this); }
    rti(): void { instructions.rti.call(this); }
    rts(): void { instructions.rts.call(this); }
    sbc(): void { instructions.sbc.call(this); }
    sec(): void { instructions.sec.call(this); }
    sed(): void { instructions.sed.call(this); }
    sei(): void { instructions.sei.call(this); }
    slo(): void { instructions.slo.call(this); }
    sta(): void { instructions.sta.call(this); }
    stx(): void { instructions.stx.call(this); }
    sty(): void { instructions.sty.call(this); }
    tax(): void { instructions.tax.call(this); }
    tay(): void { instructions.tay.call(this); }
    tsx(): void { instructions.tsx.call(this); }
    txa(): void { instructions.txa.call(this); }
    txs(): void { instructions.txs.call(this); }
    tya(): void { instructions.tya.call(this); }

    // Illegal/undocumented instructions
    isc(): void { instructions.isc.call(this); }
    anc(): void { instructions.anc.call(this); }
    rla(): void { instructions.rla.call(this); }
    sre(): void { instructions.sre.call(this); }
    alr(): void { instructions.alr.call(this); }
    rra(): void { instructions.rra.call(this); }
    sax(): void { instructions.sax.call(this); }
    lax(): void { instructions.lax.call(this); }
    arr(): void { instructions.arr.call(this); }
    shy(): void { instructions.shy.call(this); }
    dcp(): void { instructions.dcp.call(this); }
    las(): void { instructions.las.call(this); }
    ahx(): void { instructions.ahx.call(this); }
    shx(): void { instructions.shx.call(this); }
    kil(): void { instructions.kil.call(this); }
    tas(): void { instructions.tas.call(this); }
    axs(): void { instructions.axs.call(this); }
    xaa(): void { instructions.xaa.call(this); }

    ////////////////////////////////////////////////////////////////////////////////
    // Interrupt handling
    ////////////////////////////////////////////////////////////////////////////////
    
    /**
     * Updates IRQ pending state based on current IRQ line and I flag
     */
    updateIrqPending(): void {
        this.pendingIrq = this.irq && (this.I === 0) ? 1 : 0;
    }
    
    /**
     * Sets the IRQ line state
     */
    setIrq(state: boolean): void {
        this.irq = state ? 1 : 0;
        this.updateIrqPending();
    }
    
    /**
     * Sets the NMI line state  
     */
    setNmi(state: boolean): void {
        // NMI is edge-triggered (triggers on falling edge)
        const previousNmi = this.nmi;
        this.nmi = state ? 1 : 0;
        if (previousNmi && !state) {
            this.pendingNmi = 1;
        }
    }
    
    /**
     * Checks for pending interrupts and handles them
     */
    private checkInterrupts(): void {
        // NMI has higher priority than IRQ
        if (this.pendingNmi) {
            this.handleNmi();
            this.pendingNmi = 0;
        } else if (this.pendingIrq && this.I === 0) {
            this.handleIrq();
            this.pendingIrq = 0;
        }
        
        // Update IRQ pending state based on current IRQ line and I flag
        this.updateIrqPending();
    }
    
    /**
     * Handles IRQ interrupt
     */
    private handleIrq(): void {
        // Push PC to stack (high byte first)
        this.write(this.stackBase + this.S, this.PC >> 8);
        this.S = (this.S - 1) & 0xff;
        this.write(this.stackBase + this.S, this.PC & 0xff);
        this.S = (this.S - 1) & 0xff;
        
        // Push status register to stack (with B flag clear)
        let status = 0;
        status |= this.N ? 0x80 : 0;
        status |= this.V ? 0x40 : 0;
        status |= 0x20; // Unused bit always set
        // B flag is clear (0x00) for IRQ
        status |= this.D ? 0x08 : 0;
        status |= this.I ? 0x04 : 0;
        status |= this.Z ? 0x02 : 0;
        status |= this.C ? 0x01 : 0;
        this.write(this.S + 0x100, status);
        this.S = (this.S - 1) & 0xff;
        
        // Set interrupt disable flag
        this.I = 1;
        
        // Jump to IRQ vector at $FFFE/$FFFF
        this.PC = (this.read(0xffff) << 8) | this.read(0xfffe);
        
        // IRQ takes 7 cycles
        this.cycles += 7;
    }
    
    /**
     * Handles NMI interrupt
     */
    private handleNmi(): void {
        // Push PC to stack (high byte first)
        this.write(this.stackBase + this.S, this.PC >> 8);
        this.S = (this.S - 1) & 0xff;
        this.write(this.stackBase + this.S, this.PC & 0xff);
        this.S = (this.S - 1) & 0xff;
        
        // Push status register to stack (with B flag clear)
        let status = 0;
        status |= this.N ? 0x80 : 0;
        status |= this.V ? 0x40 : 0;
        status |= 0x20; // Unused bit always set
        // B flag is clear (0x00) for NMI
        status |= this.D ? 0x08 : 0;
        status |= this.I ? 0x04 : 0;
        status |= this.Z ? 0x02 : 0;
        status |= this.C ? 0x01 : 0;
        this.write(this.S + 0x100, status);
        this.S = (this.S - 1) & 0xff;
        
        // Set interrupt disable flag
        this.I = 1;
        
        // Jump to NMI vector at $FFFA/$FFFB
        this.PC = (this.read(0xfffb) << 8) | this.read(0xfffa);
        
        // NMI takes 7 cycles
        this.cycles += 7;
    }
}

export default CPU6502;