/**
 * board-activity: the machine tree carries per-part access totals.
 *
 * Runs the real Apple 1 (ROM, RAM, PIA, bus, display) on the TypeScript engine.
 */
import { describe, test, expect } from 'vitest';
import Apple1 from '../index';
import WebCRTVideo from '../WebCRTVideo';
import type { IoComponent } from '../../core/types';
import type { BoardActivitySample } from '../types/worker-messages';

const stubKeyboard: IoComponent = {
    write: async () => undefined,
    wire: () => undefined,
    reset: () => undefined,
};

const makeApple1 = () => new Apple1({ video: new WebCRTVideo(), keyboard: stubKeyboard, useDualEngine: false });

const sample = (apple1: Apple1): BoardActivitySample =>
    (apple1.getInspectable() as { activity: BoardActivitySample }).activity;

/** Run in chunks with the event loop given a turn: the display path is asynchronous. */
async function run(apple1: Apple1, chunks: number): Promise<void> {
    for (let i = 0; i < chunks; i++) {
        apple1.cpu.performBulkSteps(5000);
        await new Promise((resolve) => setTimeout(resolve, 1));
    }
}

/** Run until the monitor sits in its keyboard-polling loop. */
async function bootToPrompt(apple1: Apple1): Promise<void> {
    await run(apple1, 60);
    expect(apple1.cpu.PC, 'PC inside the monitor').toBeGreaterThanOrEqual(0xff00);
}

const delta = (before: BoardActivitySample, after: BoardActivitySample, part: string) => ({
    reads: after.parts[part].reads - before.parts[part].reads,
    writes: after.parts[part].writes - before.parts[part].writes,
});

describe('Apple 1 machine tree — board activity', () => {
    test('AC-1: the tree reports reads and writes for the four bus-addressed parts', async () => {
        const apple1 = makeApple1();
        await bootToPrompt(apple1);

        const activity = sample(apple1);

        expect(Object.keys(activity.parts).sort()).toEqual(['pia6820', 'ram1', 'ram2', 'rom']);
        // Booting the monitor fetches code from the PROMs, sets up the PIA and uses zero page.
        expect(activity.parts.rom.reads).toBeGreaterThan(0);
        expect(activity.parts.rom.writes).toBe(0);
        expect(activity.parts.pia6820.writes).toBeGreaterThan(0);
        expect(activity.parts.ram1.writes).toBeGreaterThan(0);
        expect(activity.accesses).toBeGreaterThanOrEqual(
            Object.values(activity.parts).reduce((sum, part) => sum + part.reads + part.writes, 0),
        );
        expect(typeof activity.sampledAt).toBe('number');
    });

    test('AC-3: fetching the tree and reading memory for the debugger leave the counts unchanged', async () => {
        const apple1 = makeApple1();
        await bootToPrompt(apple1);
        const before = sample(apple1);

        for (let address = 0x0000; address < 0x0100; address++) {
            apple1.bus.read(address);
            apple1.bus.peek(0xff00 + address);
        }
        apple1.bus.write(0x0200, 0x41);
        const after = sample(apple1);

        expect(after.parts).toEqual(before.parts);
        expect(after.accesses).toBe(before.accesses);
    });

    test('AC-7: at the idle monitor prompt the PROMs and the PIA are in use and RAM is not', async () => {
        const apple1 = makeApple1();
        await bootToPrompt(apple1);
        const before = sample(apple1);

        await run(apple1, 4);
        const after = sample(apple1);

        expect(delta(before, after, 'rom').reads).toBeGreaterThan(0);
        expect(delta(before, after, 'pia6820').reads).toBeGreaterThan(0);
        expect(delta(before, after, 'ram2')).toEqual({ reads: 0, writes: 0 });
        expect(delta(before, after, 'ram1')).toEqual({ reads: 0, writes: 0 });
    });

    test('AC-7: running BASIC uses the RAM bank at $E000', async () => {
        const apple1 = makeApple1();
        await bootToPrompt(apple1);
        const before = sample(apple1);

        apple1.cpu.PC = 0xe000; // what typing E000R at the prompt does
        await run(apple1, 4);
        const after = sample(apple1);

        expect(delta(before, after, 'ram2').reads).toBeGreaterThan(0);
    });
});
