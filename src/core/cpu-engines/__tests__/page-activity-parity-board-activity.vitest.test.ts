/**
 * board-activity: both engines report the same page counts for the same program.
 *
 * Needs a real WASM build. Under Node the wasm-pack "web" build loads through
 * fetch(), so this suite runs only while `yarn dev:vite` is serving and skips
 * otherwise (same gate as engine-parity).
 */
import { describe, test, expect } from 'vitest';
import { JSEngine } from '../JSEngine';
import { WasmEngine } from '../WasmEngine';
import { isWasmSupported } from '../wasm-loader';
import {
    PROGRAM,
    PROGRAM_START,
    describeActivity,
    expectedActivity,
    makeAppleBus,
    runProgram,
} from './page-activity-board-activity.fixture';

let wasmRuntimeAvailable = false;
if (isWasmSupported()) {
    try {
        const probe = new WasmEngine(makeAppleBus().bus);
        await probe.initialize();
        probe.cleanup?.();
        wasmRuntimeAvailable = true;
    } catch {
        wasmRuntimeAvailable = false;
    }
}

describe.skipIf(!wasmRuntimeAvailable)('page activity — JS vs WASM', () => {
    const makeWasm = async () => {
        const { bus, io } = makeAppleBus();
        const engine = new WasmEngine(bus);
        await engine.initialize();
        return { engine, io };
    };

    test('AC-2: both engines report identical counts for a program touching all four parts', async () => {
        const js = new JSEngine(makeAppleBus().bus);
        const { engine: wasm } = await makeWasm();

        runProgram(js);
        runProgram(wasm);

        expect(describeActivity(wasm.getPageActivity())).toEqual(describeActivity(js.getPageActivity()));
        expect(describeActivity(wasm.getPageActivity())).toEqual(describeActivity(expectedActivity()));
        wasm.cleanup?.();
    });

    test('AC-2: counts stay identical across read-modify-write, indexed, indirect, branch and subroutine instructions', async () => {
        // No expected numbers here on purpose: the JS engine is the reference.
        // prettier-ignore
        const mixed = new Uint8Array([
            0xa2, 0x05,       // 0300 LDX #$05
            0xa0, 0x02,       // 0302 LDY #$02
            0xa9, 0x00,       // 0304 LDA #$00
            0x85, 0x10,       // 0306 STA $10        pointer low
            0xa9, 0xe0,       // 0308 LDA #$E0
            0x85, 0x11,       // 030A STA $11        pointer -> $E000
            0xee, 0x00, 0xe0, // 030C INC $E000      read-modify-write, absolute
            0x06, 0x20,       // 030F ASL $20        read-modify-write, zero page
            0xfe, 0xfe, 0xe0, // 0311 INC $E0FE,X    RMW, indexed, crosses a page
            0xbd, 0xfe, 0x0f, // 0314 LDA $0FFE,X    indexed read crossing out of RAM bank 1
            0xb1, 0x10,       // 0317 LDA ($10),Y    indirect indexed
            0x91, 0x10,       // 0319 STA ($10),Y
            0xa1, 0x0b,       // 031B LDA ($0B,X)    indexed indirect via $10
            0x20, 0x30, 0x03, // 031D JSR $0330
            0xca,             // 0320 DEX
            0xd0, 0xfa,       // 0321 BNE $031D      taken four times, then falls through
            0x2c, 0x11, 0xd0, // 0323 BIT $D011
            0x6c, 0x40, 0x03, // 0326 JMP ($0340)
        ]);
        const subroutine = new Uint8Array([0x08, 0x28, 0x60]); // 0330 PHP PLP RTS
        const vector = new Uint8Array([0x50, 0x03]); // 0340 -> $0350
        const tail = new Uint8Array([0xea, 0xea]); // 0350 NOP NOP
        const steps = 13 + 5 * 6 + 4; // straight-line part, five six-instruction loop passes, BIT, JMP, two NOPs

        const run = (engine: JSEngine | WasmEngine) => {
            engine.reset();
            engine.loadProgram(mixed, 0x0300);
            engine.loadProgram(subroutine, 0x0330);
            engine.loadProgram(vector, 0x0340);
            engine.loadProgram(tail, 0x0350);
            engine.setRegisters({ PC: 0x0300 });
            for (let i = 0; i < steps; i++) {
                engine.performSingleStep();
            }
            return engine.getRegisters().PC;
        };
        const js = new JSEngine(makeAppleBus().bus);
        const { engine: wasm } = await makeWasm();

        const jsPc = run(js);
        const wasmPc = run(wasm);

        expect(jsPc, 'the program ran to its end').toBe(0x0352);
        expect(wasmPc).toBe(jsPc);
        expect(describeActivity(wasm.getPageActivity())).toEqual(describeActivity(js.getPageActivity()));
        wasm.cleanup?.();
    });

    test('AC-3: debugger reads and writes are not counted on the WASM engine', async () => {
        const { engine: wasm } = await makeWasm();
        wasm.reset();
        wasm.loadProgram(PROGRAM, PROGRAM_START);
        wasm.read(0x0300);
        wasm.write(0xe000, 0x55);
        wasm.readRange(0x0000, 0x200);
        wasm.readRange(0xff00, 0x100);

        expect(describeActivity(wasm.getPageActivity())).toEqual([]);
        wasm.cleanup?.();
    });

    test('AC-4: a PIA read and a PIA write complete through the bridge with counting on', async () => {
        const { engine: wasm, io } = await makeWasm();

        expect(() => runProgram(wasm)).not.toThrow();

        // One LDA $D011 and one STA $D012 reached the JS-side device, once each.
        expect({ reads: io.reads, writes: io.writes }).toEqual({ reads: 1, writes: 1 });
        // And the read-out, made between instructions, still works afterwards.
        expect(wasm.getPageActivity()[0xd0]).toBe(1);
        wasm.cleanup?.();
    });
});
