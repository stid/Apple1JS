/**
 * LCD Deep phase 5 — hw-accuracy, Tier 1 gate (supports AC-3)
 *
 * The PIA power-on fix moves the boot path: WOZMON's `STY $D012` now reaches
 * DDRB instead of ORB. Component tests prove the routing; this proves the
 * assembled machine still boots. It builds the real Apple 1 — ROM, RAM, PIA,
 * bus, display — and runs the monitor headlessly on the TypeScript engine.
 *
 * It asserts on the character *stream* reaching the display rather than on
 * screen contents, because the Apple 1 powers up with a noise screen drawn
 * from the same glyph set the monitor prints — so "is there a backslash on
 * screen" cannot distinguish the prompt from cold-start junk.
 *
 * The browser half of T8 still stands: this covers neither the WASM engine
 * nor real rendering.
 */
import { describe, test, expect } from 'vitest';
import Apple1 from '../index';
import WebCRTVideo from '../WebCRTVideo';
import type { IoComponent } from '../../core/types';
import type { VideoState } from '../TSTypes';

/** Wraps the real video and records every byte the system sends it. */
class RecordingVideo implements IoComponent<VideoState> {
    readonly received: number[] = [];
    constructor(private readonly inner: WebCRTVideo) {}
    async write(value: number | string): Promise<void> {
        if (typeof value === 'number') this.received.push(value);
        await this.inner.write(value as number);
    }
    wire(): void {
        // WebCRTVideo takes no wiring options — it is a pure output device.
        this.inner.wire();
    }
    reset(): void {
        this.inner.reset();
    }
    getState(): VideoState {
        return this.inner.getState();
    }
}

/** Minimal keyboard stand-in — the boot path never reads it. */
const stubKeyboard: IoComponent = {
    write: async () => undefined,
    wire: () => undefined,
    reset: () => undefined,
};

describe('Apple 1 boot — hardware accuracy', () => {
    test('boots to the WOZMON prompt with no stray character', async () => {
        const video = new RecordingVideo(new WebCRTVideo());
        const apple1 = new Apple1({ video, keyboard: stubKeyboard, useDualEngine: false });

        // The display path is asynchronous (one character per video field) and
        // the monitor polls PB7 between characters, so the CPU has to run in
        // chunks with the event loop given a turn in between.
        const deadline = Date.now() + 4000;
        while (Date.now() < deadline && video.received.length < 2) {
            apple1.cpu.performBulkSteps(5000);
            await new Promise((resolve) => setTimeout(resolve, 1));
        }

        // WOZMON's reset entry prints a backslash prompt ($DC) then a carriage
        // return ($8D). AC-3 at the system level: the prompt is the FIRST thing
        // the display receives. The pre-seeded PIA used to send $7F before it,
        // because `STY $D012` landed in ORB instead of DDRB.
        expect(video.received[0], 'first byte to the display is the prompt, not a stray $7F').toBe(0xdc);
        expect(video.received[1], 'followed by a carriage return').toBe(0x8d);

        // And the CPU is running the monitor, not jammed somewhere in RAM.
        expect(apple1.cpu.PC, 'PC should be inside the monitor ROM').toBeGreaterThanOrEqual(0xff00);
    });
    test('a keystroke echoes back to the display', async () => {
        // The full input path: key -> KeyboardLogic -> PIA port A + CA1 strobe
        // -> WOZMON's keyboard poll -> ECHO -> display. This is what broke when
        // the display handshake started querying the CPU engine mid-execution.
        let sendKey: ((v: number) => Promise<unknown>) | undefined;
        const keyboard: IoComponent = {
            write: async () => undefined,
            wire: (o) => {
                sendKey = o.write as (v: number) => Promise<unknown>;
            },
            reset: () => undefined,
        };
        const video = new RecordingVideo(new WebCRTVideo());
        const apple1 = new Apple1({ video, keyboard, useDualEngine: false });

        const spin = async (ms: number) => {
            const end = Date.now() + ms;
            while (Date.now() < end) {
                apple1.cpu.performBulkSteps(5000);
                await new Promise((r) => setTimeout(r, 1));
            }
        };

        await spin(300);
        const afterBoot = video.received.length;

        await sendKey?.(0x41); // 'A'
        await spin(600);

        expect(video.received.slice(afterBoot), 'the keystroke should echo').toContain(0xc1);
    });



});
