/**
 * SDD Phase 4 — power-on-noise-screen
 *
 * Failing tests generated from docs/specs/power-on-noise-screen/spec.md.
 * RENDER surface, video component (WebCRTVideo). See plan.md cross-path matrix.
 */
import { describe, test, expect } from 'vitest';
import WebCRTVideo from '../WebCRTVideo';

const NUM_COLUMNS = 40;
const NUM_ROWS = 24;
const DATA = 1; // WEB_VIDEO_BUFFER_ROW.DATA — each row is [rowIndex, chars[]]

// Apple-1 displayable character set: space..underscore.
const CHAR_MIN = 0x20;
const CHAR_MAX = 0x5f;

describe('power-on-noise-screen — CRTVideo', () => {
    test('AC-1 (RENDER): power-on fills 24x40 with displayable glyphs', () => {
        const video = new WebCRTVideo();
        const { buffer } = video.getState();

        expect(buffer.length).toBe(NUM_ROWS);
        for (const [, chars] of buffer) {
            expect(chars.length).toBe(NUM_COLUMNS);
            for (const ch of chars) {
                expect(ch.length).toBe(1);
                const code = ch.charCodeAt(0);
                expect(code).toBeGreaterThanOrEqual(CHAR_MIN);
                expect(code).toBeLessThanOrEqual(CHAR_MAX);
            }
        }
    });

    test('AC-2 (RENDER): two power-ons differ', () => {
        const a = new WebCRTVideo().getState().buffer;
        const b = new WebCRTVideo().getState().buffer;

        const flat = (buf: typeof a) => buf.map(([, chars]) => chars.join('')).join('');
        // Randomized per power-on: two independent cold-starts must not be identical.
        expect(flat(a)).not.toBe(flat(b));
    });

    test('AC-3 (RENDER): reset clears screen to blank', () => {
        const video = new WebCRTVideo();
        video.reset();
        const { buffer, row, column } = video.getState();

        expect(row).toBe(0);
        expect(column).toBe(0);
        for (const [, chars] of buffer) {
            for (const ch of chars) {
                expect(ch).toBe(' ');
            }
        }
    });

    test('AC-5 (RENDER): a write leaves surrounding noise intact', async () => {
        const video = new WebCRTVideo();
        const before = video.getState().buffer;
        const neighborBefore = before[0][DATA][1];
        const rowOneBefore = before[1][DATA].join('');

        // Write 'A' (0x41) to the top-left cell. write() masks bit 7, so 0x41 -> 'A'.
        await video.write(0x41);

        const after = video.getState().buffer;
        expect(after[0][DATA][0]).toBe('A'); // targeted cell changed
        expect(after[0][DATA][1]).toBe(neighborBefore); // adjacent cell untouched
        expect(after[1][DATA].join('')).toBe(rowOneBefore); // next row untouched
    });
});
