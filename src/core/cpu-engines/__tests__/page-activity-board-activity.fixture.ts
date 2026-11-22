/**
 * Shared fixture for the board-activity counter tests: one program that touches
 * every bus-addressed part of the Apple 1, and the page counts it must produce.
 * The Rust native test in wasm-cpu/src/system.rs asserts the same numbers.
 */
import Bus from '../../Bus';
import RAM from '../../RAM';
import ROM from '../../ROM';
import type { IoAddressable } from '../../types';
import type { ICPUEngine } from '../../cpu-interface/ICPUEngine';

export const PROGRAM_START = 0x0300;

// prettier-ignore
export const PROGRAM = new Uint8Array([
    0xa9, 0x42,       // LDA #$42
    0x8d, 0x00, 0xe0, // STA $E000   write RAM bank 2
    0xad, 0x00, 0xe0, // LDA $E000   read RAM bank 2
    0xad, 0x11, 0xd0, // LDA $D011   read PIA
    0x8d, 0x12, 0xd0, // STA $D012   write PIA
    0xad, 0x00, 0xff, // LDA $FF00   read PROM
    0x48,             // PHA         write stack (RAM bank 1)
    0x68,             // PLA         read stack
]);
export const PROGRAM_INSTRUCTIONS = 8;

const WRITES = 256;

/** Page counts after PROGRAM: index = page for reads, 256 + page for writes. */
export function expectedActivity(): Float64Array {
    const expected = new Float64Array(512);
    expected[0x03] = PROGRAM.length; // every program byte is fetched once
    expected[0x01] = 1; // PLA
    expected[0xe0] = 1;
    expected[0xd0] = 1;
    expected[0xff] = 1;
    expected[WRITES + 0x01] = 1; // PHA
    expected[WRITES + 0xe0] = 1;
    expected[WRITES + 0xd0] = 1;
    return expected;
}

/** Stand-in for the PIA that records what reaches it. */
export class RecordingIo implements IoAddressable {
    reads = 0;
    writes = 0;
    read(): number {
        this.reads++;
        return 0;
    }
    write(): void {
        this.writes++;
    }
}

/** A bus laid out like the Apple 1: two RAM banks, the I/O block, the monitor PROMs. */
export function makeAppleBus(): { bus: Bus; io: RecordingIo } {
    const io = new RecordingIo();
    const bus = new Bus([
        { component: new RAM(0x1000), addr: [0x0000, 0x0fff], name: 'RAM_BANK_1' },
        { component: io, addr: [0xd000, 0xdfff], name: 'PIA6820' },
        { component: new RAM(0x1000), addr: [0xe000, 0xefff], name: 'RAM_BANK_2' },
        { component: new ROM(0x100), addr: [0xff00, 0xffff], name: 'ROM' },
    ]);
    return { bus, io };
}

/** Reset, load PROGRAM and execute it to the end. */
export function runProgram(engine: ICPUEngine): void {
    engine.reset();
    engine.loadProgram(PROGRAM, PROGRAM_START);
    engine.setRegisters({ PC: PROGRAM_START });
    for (let i = 0; i < PROGRAM_INSTRUCTIONS; i++) {
        engine.performSingleStep();
    }
}

/** Non-zero slots as `r03=19` / `wE0=1`, so a failure names the page. */
export function describeActivity(activity: Float64Array): string[] {
    const out: string[] = [];
    activity.forEach((count, index) => {
        if (count !== 0) {
            const page = (index % WRITES).toString(16).toUpperCase().padStart(2, '0');
            out.push(`${index < WRITES ? 'r' : 'w'}${page}=${count}`);
        }
    });
    return out;
}
