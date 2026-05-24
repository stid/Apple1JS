/**
 * Engine hw/interrupt-state parity (SDD: wasm-js-parity, AC-7).
 *
 * The WASM engine historically reported placeholder HW_ADDR/HW_DATA ($0/$0)
 * and hardcoded IRQ_PENDING/NMI_PENDING = 'NO' in toDebug(). This asserts that,
 * after identical execution, those fields match the reference (JS) engine.
 *
 * Like the main parity suite, this is gated on a real WASM runtime — under
 * Node/vitest the wasm-pack "web" build cannot fetch(), so it SKIPS in CI and
 * runs only in the browser.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Bus from '../../Bus';
import RAM from '../../RAM';
import { JSEngine } from '../JSEngine';
import { WasmEngine } from '../WasmEngine';
import { isWasmSupported } from '../wasm-loader';

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

describe.skipIf(!wasmRuntimeAvailable)('Engine hw/interrupt-state parity', () => {
    let bus: Bus;
    let jsEngine: JSEngine;
    let wasmEngine: WasmEngine;

    beforeEach(async () => {
        bus = new Bus([{ component: new RAM(0xffff), addr: [0x0000, 0xffff], name: 'RAM' }]);
        jsEngine = new JSEngine(bus);
        await jsEngine.ensureReady();
        wasmEngine = new WasmEngine(bus);
        await wasmEngine.initialize();
    });

    afterEach(() => {
        jsEngine.cleanup?.();
        wasmEngine.cleanup?.();
    });

    // AC-7: hw/interrupt fields reflect real state and match JS
    it('AC-7: hw/interrupt fields reflect real state and match JS', () => {
        // LDA #$42 ; STA $10 — a short no-interrupt program.
        const program = [0xa9, 0x42, 0x85, 0x10];
        for (let i = 0; i < program.length; i++) {
            bus.write(i, program[i]);
            wasmEngine.write(i, program[i]);
        }
        jsEngine.reset();
        wasmEngine.reset();
        jsEngine.setRegisters({ PC: 0x0000 });
        wasmEngine.setRegisters({ PC: 0x0000 });
        for (let i = 0; i < 2; i++) {
            jsEngine.performSingleStep();
            wasmEngine.performSingleStep();
        }

        const js = jsEngine.toDebug();
        const wasm = wasmEngine.toDebug();

        // Last-bus-access must be real, not the $0000/$00 placeholder.
        expect(wasm.HW_ADDR).not.toBe('$0000');
        expect(wasm.HW_ADDR).toBe(js.HW_ADDR);
        expect(wasm.HW_DATA).toBe(js.HW_DATA);
        // No interrupt asserted ⇒ both engines report not-pending.
        expect(wasm.IRQ_PENDING).toBe(js.IRQ_PENDING);
        expect(wasm.NMI_PENDING).toBe(js.NMI_PENDING);
    });
});
