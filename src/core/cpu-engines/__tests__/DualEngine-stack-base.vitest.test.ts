import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DualEngine } from '../DualEngine';
import Bus from '../../Bus';
import RAM from '../../RAM';

vi.mock('../../../services/LoggingService', () => ({
    loggingService: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// JS engine only: the baseline lives in DualEngine, above either engine.
vi.mock('../wasm-loader', () => ({
    isWasmSupported: vi.fn(() => false),
}));

/**
 * The Woz Monitor never initialises the stack pointer, so "bytes on the stack"
 * cannot be derived from S alone ($FF - S is only right if S started at $FF).
 * DualEngine records S at reset as the stack base and reports it as STACK_BASE.
 */
describe('DualEngine stack base', () => {
    let engine: DualEngine;

    beforeEach(() => {
        const ram = new RAM();
        const bus = new Bus([{ addr: [0x0000, 0xffff], component: ram, name: 'RAM' }]);
        engine = new DualEngine(bus, 'JS');
    });

    it('reports S at reset as the base, wherever S happens to be', () => {
        engine.setRegisters({ S: 0x0e });
        engine.reset(); // three fake pushes: S = $0B
        const debug = engine.toDebug();
        expect(debug.REG_S).toBe('$0B');
        expect(debug.STACK_BASE).toBe('$0B');
    });

    it('keeps the base when S drops below it (bytes were pushed)', () => {
        engine.setRegisters({ S: 0x0e });
        engine.reset();
        engine.setRegisters({ S: 0x09 }); // e.g. a JSR
        const debug = engine.toDebug();
        expect(debug.REG_S).toBe('$09');
        expect(debug.STACK_BASE).toBe('$0B');
    });

    it('raises the base when S is seen above it (the program set its own stack)', () => {
        engine.setRegisters({ S: 0x0e });
        engine.reset();
        engine.setRegisters({ S: 0xff }); // LDX #$FF / TXS
        expect(engine.toDebug().STACK_BASE).toBe('$FF');
        engine.setRegisters({ S: 0xfd });
        expect(engine.toDebug().STACK_BASE).toBe('$FF');
    });

    it('takes a new base on the next reset, even a lower one', () => {
        engine.setRegisters({ S: 0xff });
        engine.reset(); // base $FC
        engine.setRegisters({ S: 0x40 });
        engine.reset(); // base $3D
        expect(engine.toDebug().STACK_BASE).toBe('$3D');
    });
});
