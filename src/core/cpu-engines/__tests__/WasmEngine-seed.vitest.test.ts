import { describe, it, expect } from 'vitest';
import { WasmEngine } from '../WasmEngine';
import { RAM_BANK1_START, RAM_BANK1_END, RAM_BANK2_START, RAM_BANK2_END } from '../../constants/memory';

/**
 * Regression test for the "BASIC at $E000 reads zero under WASM" bug.
 *
 * The WasmSystem keeps RAM in its own internal memory; WasmEngine.initialize()
 * flashed only the WOZ Monitor ROM and never copied the JS Bus RAM banks
 * (anniversary demo in bank 1, Integer BASIC in bank 2) into WASM. So under the
 * WASM engine $0000-$0FFF and $E000-$EFFF read as zero. seedRamFromBus() fixes
 * that by mirroring both RAM banks from the (authoritative) JS Bus into WASM.
 */
describe('WasmEngine.seedRamFromBus', () => {
    it('mirrors both RAM banks from the JS bus into WASM, leaving I/O and ROM alone', () => {
        // Bus stub: each RAM byte is a recognizable function of its address.
        const busReads: number[] = [];
        const fakeBus = {
            read: (addr: number) => {
                busReads.push(addr);
                return (addr ^ 0x5a) & 0xff;
            },
        };

        // WASM stub: capture every write so we can assert what got seeded.
        const writes = new Map<number, number>();
        const fakeWasm = { write_memory: (a: number, v: number) => writes.set(a, v) };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const engine = new WasmEngine(fakeBus as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (engine as any).wasmSystem = fakeWasm;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (engine as any).seedRamFromBus();

        // Bank 2 ($E000-$EFFF) — where Integer BASIC lives — is fully seeded.
        expect(writes.get(RAM_BANK2_START)).toBe((RAM_BANK2_START ^ 0x5a) & 0xff);
        expect(writes.get(0xe000)).toBe((0xe000 ^ 0x5a) & 0xff);
        expect(writes.get(RAM_BANK2_END)).toBe((RAM_BANK2_END ^ 0x5a) & 0xff);

        // Bank 1 ($0000-$0FFF) — anniversary demo at $0280 — is seeded too.
        expect(writes.get(RAM_BANK1_START)).toBe((RAM_BANK1_START ^ 0x5a) & 0xff);
        expect(writes.get(0x0280)).toBe((0x0280 ^ 0x5a) & 0xff);
        expect(writes.get(RAM_BANK1_END)).toBe((RAM_BANK1_END ^ 0x5a) & 0xff);

        // Exactly both banks, nothing else: no I/O ($D010-$D013) or ROM ($FF00+).
        const bank1 = RAM_BANK1_END - RAM_BANK1_START + 1;
        const bank2 = RAM_BANK2_END - RAM_BANK2_START + 1;
        expect(writes.size).toBe(bank1 + bank2);
        expect(writes.has(0xd010)).toBe(false);
        expect(writes.has(0xff00)).toBe(false);
    });
});
