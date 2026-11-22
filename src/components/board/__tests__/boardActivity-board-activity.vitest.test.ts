import { describe, test, expect } from 'vitest';
import type { BoardActivitySample } from '../../../apple1/types/worker-messages';
import type { InspectableData } from '../../../core/types/components';
import { computeBoardActivity, formatRate, readActivitySample } from '../boardActivity';

const at = (
    sampledAt: number,
    accesses: number,
    parts: Record<string, [number, number]>,
): BoardActivitySample => ({
    sampledAt,
    accesses,
    parts: Object.fromEntries(Object.entries(parts).map(([id, [reads, writes]]) => [id, { reads, writes }])),
});

describe('computeBoardActivity', () => {
    test('AC-5 (RENDER): rates are the count difference scaled to one second', () => {
        const previous = at(1000, 10_000, { rom: [8000, 0], ram1: [100, 50] });
        const current = at(1500, 510_000, { rom: [408_000, 0], ram1: [1100, 250] });

        const activity = computeBoardActivity(previous, current);

        expect(activity?.parts.rom).toEqual({ readsPerSecond: 800_000, writesPerSecond: 0, active: true });
        expect(activity?.parts.ram1).toEqual({ readsPerSecond: 2000, writesPerSecond: 400, active: true });
    });

    test('AC-6 (RENDER): a part with no access in the interval is not active; the CPU and bus follow the totals', () => {
        const previous = at(0, 100, { rom: [100, 0], ram2: [7, 3] });
        const current = at(500, 300, { rom: [300, 0], ram2: [7, 3] });

        const activity = computeBoardActivity(previous, current);

        expect(activity?.parts.ram2).toEqual({ readsPerSecond: 0, writesPerSecond: 0, active: false });
        expect(activity?.cpuActive).toBe(true);
        expect(activity?.busActive).toBe(true);
    });

    test('AC-6 (RENDER): accesses to unmapped addresses light the CPU but not the bus', () => {
        const previous = at(0, 100, { rom: [100, 0] });
        const current = at(500, 400, { rom: [100, 0] });

        const activity = computeBoardActivity(previous, current);

        expect(activity?.cpuActive).toBe(true);
        expect(activity?.busActive).toBe(false);
    });

    test('AC-8 (RENDER): identical samples (paused) give zero rates and nothing active', () => {
        const previous = at(0, 500, { rom: [400, 0], pia6820: [90, 10] });
        const current = at(500, 500, { rom: [400, 0], pia6820: [90, 10] });

        const activity = computeBoardActivity(previous, current);

        expect(activity).toEqual({
            cpuActive: false,
            busActive: false,
            parts: {
                rom: { readsPerSecond: 0, writesPerSecond: 0, active: false },
                pia6820: { readsPerSecond: 0, writesPerSecond: 0, active: false },
            },
        });
    });

    test('AC-9 (RENDER): no rate for the first sample, a backwards counter, or no elapsed time', () => {
        const high = at(0, 900_000, { rom: [800_000, 0] });
        const afterReset = at(500, 1200, { rom: [1000, 0] });

        expect(computeBoardActivity(undefined, high)).toBeNull();
        expect(computeBoardActivity(high, undefined)).toBeNull();
        expect(computeBoardActivity(high, afterReset)).toBeNull();
        // One part backwards is enough, even when the total went up.
        expect(
            computeBoardActivity(at(0, 100, { rom: [50, 0], ram1: [40, 0] }), at(500, 200, { rom: [150, 0], ram1: [0, 0] })),
        ).toBeNull();
        expect(computeBoardActivity(high, { ...high })).toBeNull();
    });
});

describe('formatRate', () => {
    test('AC-5 (RENDER): rates are shortened for display', () => {
        expect(formatRate(0)).toBe('0/s');
        expect(formatRate(7.6)).toBe('8/s');
        expect(formatRate(999)).toBe('999/s');
        expect(formatRate(1000)).toBe('1.0k/s');
        expect(formatRate(41_250)).toBe('41k/s');
        expect(formatRate(412_300)).toBe('412k/s');
        expect(formatRate(1_250_000)).toBe('1.3M/s');
    });
});

describe('readActivitySample', () => {
    test('AC-5 (RENDER): reads the sample from the tree root and tolerates its absence', () => {
        const sample = at(10, 5, { rom: [5, 0] });

        expect(readActivitySample({ id: 'apple1', type: 'Apple1', activity: sample } as InspectableData)).toEqual(sample);
        expect(readActivitySample({ id: 'apple1', type: 'Apple1' } as InspectableData)).toBeUndefined();
        expect(readActivitySample({ id: 'apple1', type: 'Apple1', activity: 'nope' } as InspectableData)).toBeUndefined();
    });
});
