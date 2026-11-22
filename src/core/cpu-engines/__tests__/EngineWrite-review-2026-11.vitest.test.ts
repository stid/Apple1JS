/**
 * A debugger write to an I/O address must reach the device exactly once.
 *
 * Under WASM, `write_memory` on an I/O address is routed by the Rust bus back
 * out to the JS Bus (the memory bridge). WasmEngine then wrote the JS Bus again,
 * and DualEngine wrote through the JS engine as well: three PIA writes for one
 * poke to $D012, i.e. the character printed three times.
 */
import { describe, it, expect, vi } from 'vitest';
import { WasmEngine } from '../WasmEngine';
import { DualEngine } from '../DualEngine';
import Bus from '../../Bus';
import RAM from '../../RAM';
import type { IoAddressable } from '../../types/bus';

const DSP = 0xd012;

/** Bus with RAM at $0000-$0FFF and a write-counting device at $D010-$D013. */
function makeBus() {
    const deviceWrites: Array<[number, number]> = [];
    const device = {
        read: () => 0,
        write: (address: number, value: number) => {
            deviceWrites.push([address, value]);
        },
        flash: () => {},
    } as unknown as IoAddressable;
    const bus = new Bus([
        { component: new RAM(0x1000), addr: [0x0000, 0x0fff], name: 'RAM' },
        { component: device, addr: [0xd010, 0xd013], name: 'PIA' },
    ]);
    return { bus, deviceWrites };
}

/** Stand-in for the Rust system: RAM kept locally, I/O routed to the JS bus. */
function attachFakeWasm(engine: WasmEngine, bus: Bus) {
    const ram = new Map<number, number>();
    const fakeWasm = {
        write_memory: vi.fn((address: number, value: number) => {
            if (address >= 0xd000 && address <= 0xdfff) bus.write(address, value);
            else ram.set(address, value);
        }),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (engine as any).wasmSystem = fakeWasm;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (engine as any)._isReady = true;
    return { ram, fakeWasm };
}

describe('I/O writes reach the device once (review-2026-11)', () => {
    it('WasmEngine.write delivers an I/O write once and still mirrors RAM to the JS bus', () => {
        const { bus, deviceWrites } = makeBus();
        const engine = new WasmEngine(bus);
        const { ram } = attachFakeWasm(engine, bus);

        engine.write(DSP, 0x41);
        engine.write(0x0200, 0x99);

        expect(deviceWrites).toEqual([[2, 0x41]]);
        expect(ram.get(0x0200)).toBe(0x99);
        expect(bus.read(0x0200)).toBe(0x99);
    });

    it('WasmEngine.writeRange delivers each I/O byte once', () => {
        const { bus, deviceWrites } = makeBus();
        const engine = new WasmEngine(bus);
        attachFakeWasm(engine, bus);

        engine.writeRange(0xd010, new Uint8Array([1, 2, 3, 4]));

        expect(deviceWrites).toHaveLength(4);
    });

    it('DualEngine.write delivers an I/O write once with both engines live', () => {
        const { bus, deviceWrites } = makeBus();
        const dual = new DualEngine(bus, 'JS');
        const wasm = new WasmEngine(bus);
        const { ram } = attachFakeWasm(wasm, bus);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (dual as any).wasmEngine = wasm;

        dual.write(DSP, 0x41);
        dual.write(0x0200, 0x77);

        expect(deviceWrites).toEqual([[2, 0x41]]);
        // RAM still goes to both engines.
        expect(ram.get(0x0200)).toBe(0x77);
        expect(bus.read(0x0200)).toBe(0x77);
    });

    it('DualEngine.writeRange across the I/O block delivers each device byte once', () => {
        const { bus, deviceWrites } = makeBus();
        const dual = new DualEngine(bus, 'JS');
        const wasm = new WasmEngine(bus);
        attachFakeWasm(wasm, bus);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (dual as any).wasmEngine = wasm;

        dual.writeRange(0xd010, new Uint8Array([1, 2, 3, 4]));

        expect(deviceWrites).toHaveLength(4);
    });
});

describe('DualEngine falls back when WASM cannot initialise (review-2026-11)', () => {
    it('hands over to the JS engine instead of keeping the dead WASM engine active', async () => {
        const { bus } = makeBus();
        const dual = new DualEngine(bus, 'WASM');
        const wasm = new WasmEngine(bus);
        vi.spyOn(wasm, 'initialize').mockRejectedValue(new Error('fetch failed'));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (dual as any).wasmEngine = wasm;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (dual as any).activeEngine = wasm;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (dual as any).activeEngineType = 'WASM';

        await dual.initialize();

        expect(dual.engineType).toBe('JS');
        expect(() => dual.getRegisters()).not.toThrow();
        expect(dual.getAvailableEngines()).toEqual(['JS']);
    });
});
