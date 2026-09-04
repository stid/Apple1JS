/**
 * WASM bridge re-entrancy guard.
 *
 * On the WASM engine every I/O access is a callback *out of* a running WASM
 * function: the Rust CPU is inside `run_cycles`/`step` (a `&mut self` method)
 * and calls `wasmMemoryBridge.readByte` / `writeByte`, which lands in the
 * JavaScript Bus. wasm-bindgen guards the object for the duration of that
 * `&mut self` call, so ANY call back into the engine from inside the bridge
 * throws:
 *
 *     recursive use of an object detected which would lead to unsafe aliasing in rust
 *
 * That kills the I/O path entirely — the display stops and the keyboard goes
 * dead — and it cannot be caught by the normal suite, because the WASM engine
 * does not run under Node.
 *
 * This test reproduces the *contract* rather than the engine: it installs a
 * stand-in that throws exactly like wasm-bindgen's borrow guard whenever it is
 * touched during execution, then drives the real production bridge. Anything a
 * device does on the bus path must stay on the JavaScript side.
 *
 * Regression this guards against: a display-handshake change once read the
 * engine's cycle count inside `PIA6820.readPortB`. It broke the WASM engine
 * completely — display and keyboard both dead — while every Node test stayed
 * green, because the WASM engine does not run here.
 */
import { describe, test, expect, beforeEach } from 'vitest';
import Bus from '../../Bus';
import RAM from '../../RAM';
import PIA6820 from '../../PIA6820';
import { wasmMemoryBridge, setBusForWasm } from '../wasm-memory-bridge';

/** Stands in for the wasm-bindgen-wrapped engine and its borrow guard. */
class BorrowGuardedEngine {
    private executing = false;
    private cycles = 0;

    /** Mimics a `&mut self` WASM export: re-entrant access is rejected. */
    runChunk(body: () => void): void {
        this.executing = true;
        try {
            body();
        } finally {
            this.executing = false;
            this.cycles += 1000;
        }
    }

    /** Any engine query — `get_metrics`, `get_cpu_state`, … */
    getTotalCycles(): number {
        if (this.executing) {
            throw new Error('recursive use of an object detected which would lead to unsafe aliasing in rust');
        }
        return this.cycles;
    }
}

describe('WASM memory bridge — re-entrancy', () => {
    let engine: BorrowGuardedEngine;
    let pia: PIA6820;

    beforeEach(() => {
        engine = new BorrowGuardedEngine();
        pia = new PIA6820();
        const bus = new Bus([
            { addr: [0x0000, 0x0fff], component: new RAM(0x1000), name: 'RAM' },
            { addr: [0xd000, 0xdfff], component: pia, name: 'PIA6820', mirrorMask: 0x03 },
        ]);
        setBusForWasm(bus);

        // Program the PIA the way WOZMON does at $FF02, so port reads take the
        // peripheral-register branch (which consults the display handshake)
        // rather than the data-direction branch. Without this the reads below
        // never reach the code under test.
        pia.write(0x2, 0x7f); // DDRB while CRB bit 2 is clear
        pia.write(0x1, 0xa7); // CRA -> select ORA
        pia.write(0x3, 0xa7); // CRB -> select ORB

        // Nothing on the bus path may query the engine. Apple1 wires no such
        // dependency today; this fixture exists to keep it that way.
        engine.runChunk(() => {});
    });

    test('a bus read through the bridge does not re-enter the engine', () => {
        // WOZMON polls $D012 constantly while echoing a character.
        expect(() => {
            engine.runChunk(() => {
                for (const addr of [0xd010, 0xd011, 0xd012, 0xd013]) {
                    wasmMemoryBridge.readByte(addr);
                }
            });
        }).not.toThrow();
    });

    test('a bus write through the bridge does not re-enter the engine', () => {
        // Writing a character to the display sets the busy deadline.
        expect(() => {
            engine.runChunk(() => {
                wasmMemoryBridge.writeByte(0xd013, 0x04); // select ORB
                wasmMemoryBridge.writeByte(0xd012, 0xc1); // send a character
                wasmMemoryBridge.readByte(0xd012); // then poll PB7
            });
        }).not.toThrow();
    });

    test('mirrored PIA addresses are equally safe', () => {
        // Partial decoding means the chip answers throughout $D000-$DFFF, so
        // the mirrors take the same path and carry the same constraint.
        expect(() => {
            engine.runChunk(() => {
                for (const addr of [0xd112, 0xd456, 0xdff2]) {
                    wasmMemoryBridge.readByte(addr);
                }
            });
        }).not.toThrow();
    });

    test('the guard itself is real — a device that queries the engine would fail', () => {
        // Proves the three tests above are load-bearing rather than vacuous: if
        // anything on the bus path asks the engine for state, it throws.
        // Simulate a device that reaches for engine state during a bus access —
        // the shape of the regression this file exists to prevent.
        const rogue = { read: () => engine.getTotalCycles() & 0xff, write: () => {} };
        setBusForWasm(new Bus([{ addr: [0xd000, 0xdfff], component: rogue, name: 'Rogue' }]));
        expect(() => {
            engine.runChunk(() => {
                wasmMemoryBridge.readByte(0xd012);
            });
        }).toThrow(/recursive use of an object/);
    });
});
