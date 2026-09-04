/**
 * LCD Deep phase 4 — hw-accuracy (AC-11)
 *
 * RENDER surface — the terminal character set. From
 * `docs/active/hardware-accuracy-audit.md` finding 14.
 * Plan cross-path matrix binds this to `src/apple1/WebCRTVideo.ts`.
 *
 * The Apple 1's character generator holds 64 glyphs and cannot show lowercase.
 * The terminal ignores ASCII bit 5 and inverts bit 6, so lowercase folds to
 * uppercase rather than being dropped. The displayable range is $20-$5F — the
 * same set this component already uses for its power-on noise screen.
 */
import { describe, test, expect, beforeEach } from 'vitest';
import WebCRTVideo from '../WebCRTVideo';

const GLYPH_MIN = 0x20;
const GLYPH_MAX = 0x5f;

describe('WebCRTVideo — hardware accuracy', () => {
    let video: WebCRTVideo;

    beforeEach(() => {
        video = new WebCRTVideo();
        video.reset();
    });

    /** Characters written so far on the current row, trailing blanks trimmed. */
    function currentRow(): string {
        const { buffer, row } = video.getState();
        return buffer[row][1].join('').replace(/\s+$/, '');
    }

    test('AC-11 (RENDER): characters fold into the 64-glyph uppercase repertoire', async () => {
        await video.write(0xe1); // 'a' with bit 7 set, as the monitor sends it
        await video.write(0xfa); // 'z'
        await video.write(0xc1); // 'A' — already in the repertoire, unchanged

        expect(currentRow(), 'lowercase folds to uppercase').toBe('AZA');

        // Nothing on screen may fall outside the character generator's set.
        const { buffer } = video.getState();
        for (const [, chars] of buffer) {
            for (const ch of chars) {
                const code = ch.charCodeAt(0);
                expect(code, `glyph ${JSON.stringify(ch)} outside $20-$5F`).toBeGreaterThanOrEqual(GLYPH_MIN);
                expect(code, `glyph ${JSON.stringify(ch)} outside $20-$5F`).toBeLessThanOrEqual(GLYPH_MAX);
            }
        }
    });
});
