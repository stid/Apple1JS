import { readCpuRegisters } from '../debug-helpers';

describe('readCpuRegisters', () => {
    it('reads the nested-flattened convention (REG_*/FLAG_*)', () => {
        const r = readCpuRegisters({
            REG_PC: 0x1234,
            REG_A: 0x10,
            REG_X: 0x20,
            REG_Y: 0x30,
            REG_S: 0xff,
            FLAG_N: 'SET',
            FLAG_V: 'CLR',
            FLAG_D: 'CLR',
            FLAG_I: 'SET',
            FLAG_Z: 'CLR',
            FLAG_C: 'SET',
        });
        expect(r.pc).toBe(0x1234);
        expect(r.a).toBe(0x10);
        expect(r.s).toBe(0xff);
        expect(r.flags).toEqual({ n: true, v: false, d: false, i: true, z: false, c: true });
    });

    it('falls back to the flat convention (PC/N) when REG_*/FLAG_* are absent', () => {
        const r = readCpuRegisters({ PC: 0xabcd, X: 0x42, N: 'SET', C: 'CLR' });
        expect(r.pc).toBe(0xabcd);
        expect(r.x).toBe(0x42);
        expect(r.flags.n).toBe(true);
        expect(r.flags.c).toBe(false);
    });

    it('defaults missing registers to 0 and missing flags to false', () => {
        const r = readCpuRegisters({});
        expect(r).toEqual({
            pc: 0,
            a: 0,
            x: 0,
            y: 0,
            s: 0,
            flags: { n: false, v: false, d: false, i: false, z: false, c: false },
        });
    });
});
