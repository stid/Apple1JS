/**
 * Engine Parity Tests
 *
 * Ensures that both JS and WASM engines produce identical results
 * for all implemented instructions.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Bus from '../../Bus';
import RAM from '../../RAM';
import { JSEngine } from '../JSEngine';
import { WasmEngine } from '../WasmEngine';
import { DualEngine } from '../DualEngine';
import { isWasmSupported } from '../wasm-loader';
import type { CPURegisters } from '../../cpu-interface/ICPUEngine';

// WASM availability is checked two ways:
//  - wasmSupported: the platform exposes WebAssembly (true even under Node).
//  - wasmRuntimeAvailable: a WASM engine can actually initialize here. Under
//    Node/vitest the wasm-pack "web" build loads via fetch(), which is absent,
//    so the parity suite is skipped in CI and only runs in the browser.
const wasmSupported = isWasmSupported();

let wasmRuntimeAvailable = false;
if (wasmSupported) {
    try {
        const probeBus = new Bus([{ component: new RAM(0xffff), addr: [0x0000, 0xffff], name: 'RAM' }]);
        const probe = new WasmEngine(probeBus);
        await probe.initialize();
        probe.cleanup?.();
        wasmRuntimeAvailable = true;
    } catch {
        wasmRuntimeAvailable = false;
    }
}

describe.skipIf(!wasmRuntimeAvailable)('CPU Engine Parity Tests', () => {
    let bus: Bus;
    let jsEngine: JSEngine;
    let wasmEngine: WasmEngine | null = null;
    let ram: RAM;

    beforeEach(async () => {
        // Create a simple bus with RAM
        ram = new RAM(0xffff); // Full 64KB
        bus = new Bus([
            {
                component: ram,
                addr: [0x0000, 0xffff],
                name: 'RAM',
            },
        ]);

        // Create JS engine
        jsEngine = new JSEngine(bus);
        await jsEngine.ensureReady();

        // Try to create WASM engine if supported
        if (wasmSupported) {
            try {
                wasmEngine = new WasmEngine(bus);
                await wasmEngine.initialize();
            } catch (error) {
                console.warn('WASM engine initialization failed:', error);
                wasmEngine = null;
            }
        }
    });

    afterEach(() => {
        // Clean up engines
        jsEngine.cleanup?.();
        wasmEngine?.cleanup?.();
    });

    // Helper function removed - not used in current tests

    /**
     * Helper to compare both engines
     * Returns early without assertions if WASM is not available
     */
    function compareEngines(program: number[], cycles: number, verifyState?: (registers: CPURegisters) => void) {
        // The suite is gated by describe.skipIf, so a missing engine here is a
        // real failure (init regressed) rather than an expected skip.
        if (!wasmEngine) {
            throw new Error('WASM engine expected but failed to initialize');
        }

        // Reset both engines first
        jsEngine.reset();
        wasmEngine.reset();

        // Load program into BOTH engines' memory
        // JS engine reads from bus, WASM engine has its own RAM
        for (let i = 0; i < program.length; i++) {
            bus.write(0x0000 + i, program[i]); // For JS engine (uses bus)
            wasmEngine.write(0x0000 + i, program[i]); // For WASM engine (its own RAM)
        }

        // Set PC to start of program
        jsEngine.setRegisters({ PC: 0x0000 });
        wasmEngine.setRegisters({ PC: 0x0000 });

        // Execute the same number of cycles on both
        for (let i = 0; i < cycles; i++) {
            jsEngine.performSingleStep();
            wasmEngine.performSingleStep();
        }

        // Get final state from both engines
        const jsRegisters = jsEngine.getRegisters();
        const wasmRegisters = wasmEngine.getRegisters();

        // Compare registers
        expect(wasmRegisters.PC).toBe(jsRegisters.PC);
        expect(wasmRegisters.A).toBe(jsRegisters.A);
        expect(wasmRegisters.X).toBe(jsRegisters.X);
        expect(wasmRegisters.Y).toBe(jsRegisters.Y);
        expect(wasmRegisters.S).toBe(jsRegisters.S);
        expect(wasmRegisters.N).toBe(jsRegisters.N);
        expect(wasmRegisters.Z).toBe(jsRegisters.Z);
        expect(wasmRegisters.C).toBe(jsRegisters.C);
        expect(wasmRegisters.V).toBe(jsRegisters.V);
        expect(wasmRegisters.I).toBe(jsRegisters.I);
        expect(wasmRegisters.D).toBe(jsRegisters.D);

        // Additional verification if provided
        if (verifyState) {
            verifyState(jsRegisters);
            verifyState(wasmRegisters);
        }
    }

    describe('Basic Operations', () => {
        it('NOP instruction', () => {
            compareEngines(
                [0xea], // NOP
                1,
                (regs) => {
                    expect(regs.PC).toBe(0x0001);
                },
            );
        });

        it('LDA immediate', () => {
            compareEngines(
                [0xa9, 0x42], // LDA #$42
                1,
                (regs) => {
                    expect(regs.A).toBe(0x42);
                    expect(regs.PC).toBe(0x0002);
                    expect(regs.Z).toBe(0);
                    expect(regs.N).toBe(0);
                },
            );
        });

        it('LDA immediate zero', () => {
            compareEngines(
                [0xa9, 0x00], // LDA #$00
                1,
                (regs) => {
                    expect(regs.A).toBe(0x00);
                    expect(regs.Z).toBe(1);
                    expect(regs.N).toBe(0);
                },
            );
        });

        it('LDA immediate negative', () => {
            compareEngines(
                [0xa9, 0x80], // LDA #$80
                1,
                (regs) => {
                    expect(regs.A).toBe(0x80);
                    expect(regs.Z).toBe(0);
                    expect(regs.N).toBe(1);
                },
            );
        });
    });

    describe('Memory Operations', () => {
        it('STA zero page', () => {
            // First load a value, then store it
            compareEngines(
                [
                    0xa9,
                    0x42, // LDA #$42
                    0x85,
                    0x10, // STA $10
                ],
                2,
                (regs) => {
                    expect(regs.A).toBe(0x42);
                    expect(regs.PC).toBe(0x0004);
                    // Verify memory was written
                    expect(bus.read(0x10)).toBe(0x42);
                },
            );
        });

        it('LDA zero page', () => {
            // Pre-load memory into both engines
            bus.write(0x20, 0x55);
            wasmEngine?.write(0x20, 0x55);

            compareEngines(
                [0xa5, 0x20], // LDA $20
                1,
                (regs) => {
                    expect(regs.A).toBe(0x55);
                    expect(regs.PC).toBe(0x0002);
                },
            );
        });

        it('LDX immediate and STX zero page', () => {
            compareEngines(
                [
                    0xa2,
                    0x33, // LDX #$33
                    0x86,
                    0x30, // STX $30
                ],
                2,
                (regs) => {
                    expect(regs.X).toBe(0x33);
                    expect(regs.PC).toBe(0x0004);
                    expect(bus.read(0x30)).toBe(0x33);
                },
            );
        });

        it('LDY immediate and STY zero page', () => {
            compareEngines(
                [
                    0xa0,
                    0x44, // LDY #$44
                    0x84,
                    0x40, // STY $40
                ],
                2,
                (regs) => {
                    expect(regs.Y).toBe(0x44);
                    expect(regs.PC).toBe(0x0004);
                    expect(bus.read(0x40)).toBe(0x44);
                },
            );
        });
    });

    describe('Arithmetic Operations', () => {
        it('ADC without carry', () => {
            compareEngines(
                [
                    0x18, // CLC
                    0xa9,
                    0x10, // LDA #$10
                    0x69,
                    0x20, // ADC #$20
                ],
                3,
                (regs) => {
                    expect(regs.A).toBe(0x30);
                    expect(regs.C).toBe(0);
                    expect(regs.Z).toBe(0);
                    expect(regs.N).toBe(0);
                    expect(regs.V).toBe(0);
                },
            );
        });

        it('ADC with carry', () => {
            compareEngines(
                [
                    0x38, // SEC
                    0xa9,
                    0x10, // LDA #$10
                    0x69,
                    0x20, // ADC #$20
                ],
                3,
                (regs) => {
                    expect(regs.A).toBe(0x31);
                    expect(regs.C).toBe(0);
                },
            );
        });

        it('SBC without borrow', () => {
            compareEngines(
                [
                    0x38, // SEC
                    0xa9,
                    0x30, // LDA #$30
                    0xe9,
                    0x10, // SBC #$10
                ],
                3,
                (regs) => {
                    expect(regs.A).toBe(0x20);
                    expect(regs.C).toBe(1); // No borrow
                },
            );
        });
    });

    describe('Logical Operations', () => {
        it('AND operation', () => {
            compareEngines(
                [
                    0xa9,
                    0xff, // LDA #$FF
                    0x29,
                    0x0f, // AND #$0F
                ],
                2,
                (regs) => {
                    expect(regs.A).toBe(0x0f);
                    expect(regs.Z).toBe(0);
                    expect(regs.N).toBe(0);
                },
            );
        });

        it('ORA operation', () => {
            compareEngines(
                [
                    0xa9,
                    0x0f, // LDA #$0F
                    0x09,
                    0xf0, // ORA #$F0
                ],
                2,
                (regs) => {
                    expect(regs.A).toBe(0xff);
                    expect(regs.Z).toBe(0);
                    expect(regs.N).toBe(1);
                },
            );
        });

        it('EOR operation', () => {
            compareEngines(
                [
                    0xa9,
                    0xff, // LDA #$FF
                    0x49,
                    0xff, // EOR #$FF
                ],
                2,
                (regs) => {
                    expect(regs.A).toBe(0x00);
                    expect(regs.Z).toBe(1);
                    expect(regs.N).toBe(0);
                },
            );
        });
    });

    describe('State Transfer', () => {
        it('State save and load consistency', async () => {
            if (!wasmEngine) {
                throw new Error('WASM engine expected but failed to initialize');
            }

            // Set up initial state in JS engine
            jsEngine.reset();
            jsEngine.setRegisters({
                PC: 0x1234,
                A: 0x42,
                X: 0x11,
                Y: 0x22,
                S: 0xfd,
                N: 1,
                Z: 0,
                C: 1,
                V: 0,
                I: 1,
                D: 0,
            });

            // Save state from JS engine
            const state = jsEngine.saveState();

            // Load state into WASM engine
            wasmEngine.reset();
            wasmEngine.loadState(state);

            // Compare registers
            const jsRegs = jsEngine.getRegisters();
            const wasmRegs = wasmEngine.getRegisters();

            expect(wasmRegs.PC).toBe(jsRegs.PC);
            expect(wasmRegs.A).toBe(jsRegs.A);
            expect(wasmRegs.X).toBe(jsRegs.X);
            expect(wasmRegs.Y).toBe(jsRegs.Y);
            expect(wasmRegs.S).toBe(jsRegs.S);
            expect(wasmRegs.N).toBe(jsRegs.N);
            expect(wasmRegs.Z).toBe(jsRegs.Z);
            expect(wasmRegs.C).toBe(jsRegs.C);
            expect(wasmRegs.V).toBe(jsRegs.V);
            expect(wasmRegs.I).toBe(jsRegs.I);
            expect(wasmRegs.D).toBe(jsRegs.D);
        });
    });

    describe('DualEngine Switching', () => {
        it('Can switch between engines without state loss', async () => {
            if (!wasmEngine) {
                throw new Error('WASM engine expected but failed to initialize');
            }

            const dualEngine = new DualEngine(bus, 'JS');
            await dualEngine.initialize();

            // Load a program into both engines' memory
            // Note: Each engine has its own RAM, so we must load into both
            const program = [
                0xa9,
                0x42, // LDA #$42
                0xaa, // TAX
                0xa8, // TAY
            ];

            // Use dualEngine.write() to write to active engine (JS)
            // and also write to bus for JS, then we'll need to handle WASM separately
            for (let i = 0; i < program.length; i++) {
                dualEngine.write(i, program[i]); // Writes to active engine + bus
            }

            // Execute first instruction in JS mode
            dualEngine.setRegisters({ PC: 0x0000 });
            dualEngine.performSingleStep();

            expect(dualEngine.getRegisters().A).toBe(0x42);
            expect(dualEngine.engineType).toBe('JS');

            // Switch to WASM
            await dualEngine.switchEngine('WASM');
            expect(dualEngine.engineType).toBe('WASM');

            // Verify state preserved
            expect(dualEngine.getRegisters().A).toBe(0x42);
            expect(dualEngine.getRegisters().PC).toBe(0x0002);

            // Execute next instruction in WASM mode
            dualEngine.performSingleStep();
            expect(dualEngine.getRegisters().X).toBe(0x42);

            // Switch back to JS
            await dualEngine.switchEngine('JS');
            expect(dualEngine.engineType).toBe('JS');

            // Verify state still preserved
            expect(dualEngine.getRegisters().A).toBe(0x42);
            expect(dualEngine.getRegisters().X).toBe(0x42);
            expect(dualEngine.getRegisters().PC).toBe(0x0003);

            // Execute final instruction in JS mode
            dualEngine.performSingleStep();
            expect(dualEngine.getRegisters().Y).toBe(0x42);

            dualEngine.cleanup();
        });

        it('Emits switch events', async () => {
            if (!wasmEngine) {
                throw new Error('WASM engine expected but failed to initialize');
            }

            const dualEngine = new DualEngine(bus, 'JS');
            await dualEngine.initialize();

            let switchEvent: unknown = null;
            const unsubscribe = dualEngine.onEngineSwitch((event) => {
                switchEvent = event;
            });

            await dualEngine.switchEngine('WASM');

            expect(switchEvent).toBeTruthy();
            expect(switchEvent).not.toBeNull();
            expect((switchEvent as { from: string }).from).toBe('JS');
            expect((switchEvent as { to: string }).to).toBe('WASM');
            expect((switchEvent as { reason: string }).reason).toBe('user');

            unsubscribe();
            dualEngine.cleanup();
        });
    });
});
