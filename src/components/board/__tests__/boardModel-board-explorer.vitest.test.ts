import { describe, expect, it } from 'vitest';
import { BOARD_PARTS, describeNode, findNode } from '../boardModel';
import type { InspectableData } from '../../../core/types/components';
import type { FilteredDebugData } from '../../../apple1/types/worker-messages';

// Shaped like Apple1.getInspectable(): the Bus repeats the mapped components as
// `component` on its children, and the PIA nests its two IO devices.
const tree: InspectableData = {
    id: 'apple1',
    type: 'Apple1',
    name: 'Apple 1',
    children: [
        { id: 'cpu6502', type: 'CPU6502', name: '6502' },
        {
            id: 'bus',
            type: 'Bus',
            name: 'Bus',
            mappingCount: 4,
            children: [
                { id: 'rom', type: 'BusMapping', name: 'rom [$FF00-$FFFF]', component: { id: 'rom', type: 'ROM' } },
            ],
        },
        { id: 'rom', type: 'ROM', name: 'ROM', size: 256, address: '$FF00' },
        { id: 'ram1', type: 'RAM', name: 'RAM bank 1', size: 4096 },
        { id: 'ram2', type: 'RAM', name: 'RAM bank 2', size: 4096 },
        {
            id: 'pia6820',
            type: 'PIA6820',
            name: 'PIA',
            children: [
                {
                    id: 'crtvideo',
                    type: 'IoComponent',
                    name: 'Video Output',
                    component: { id: 'crtvideo', type: 'IoComponent', rows: 24 },
                },
            ],
        },
        { id: 'clock', type: 'Clock', name: 'Clock', frequency: 1000000 },
        { id: 'video', type: 'IoComponent', name: 'Video Output' },
        { id: 'keyboard', type: 'IoComponent', name: 'Keyboard Input' },
    ],
} as InspectableData;

const noDebug = {} as FilteredDebugData;

describe('boardModel', () => {
    it('AC-2 (RENDER): every top-level machine node is reachable from a board part', () => {
        const mapped = new Set(BOARD_PARTS.map((part) => part.nodeId).filter(Boolean));
        for (const id of ['cpu6502', 'bus', 'rom', 'ram1', 'ram2', 'pia6820', 'clock', 'video', 'keyboard']) {
            expect(mapped.has(id), `no board part maps to "${id}"`).toBe(true);
        }
    });

    it('AC-3 (RENDER): parts without emulation carry no node id', () => {
        const dim = BOARD_PARTS.filter((part) => part.kind === 'dim');
        expect(dim.length).toBeGreaterThan(0);
        expect(dim.every((part) => part.nodeId === undefined)).toBe(true);
    });

    it('finds a node by id anywhere in the tree', () => {
        expect(findNode(tree, 'clock')?.type).toBe('Clock');
        expect(findNode(tree, 'missing')).toBeUndefined();
    });

    it('prefers the richer copy when an id appears twice (Bus mapping vs the component itself)', () => {
        // The Bus child comes first and has fewer fields; the real ROM node must win.
        const rom = findNode(tree, 'rom');
        expect(rom?.type).toBe('ROM');
        expect(rom?.size).toBe(256);
    });

    it('finds nodes nested as `component` under a child', () => {
        expect(findNode(tree, 'crtvideo')?.rows).toBe(24);
    });

    it('lists scalar config fields and leaves out identity and nested objects', () => {
        const fields = describeNode(findNode(tree, 'rom') as InspectableData, noDebug);
        expect(fields).toEqual([
            { key: 'size', value: '256', kind: 'status' },
            { key: 'address', value: '$FF00', kind: 'status' },
        ]);
    });

    it('merges CPU debug data, flattening nested groups and skipping profiling data', () => {
        const debug = {
            cpu: { REG_PC: '$FF29', FLAGS: { N: 'CLR' }, HW_ADDR: '$D011', _PERF_DATA: { stats: {} } },
        } as unknown as FilteredDebugData;
        const fields = describeNode(findNode(tree, 'cpu6502') as InspectableData, debug);
        expect(fields).toContainEqual({ key: 'REG_PC', value: '$FF29', kind: 'value' });
        expect(fields).toContainEqual({ key: 'FLAGS_N', value: 'CLR', kind: 'flag' });
        expect(fields).toContainEqual({ key: 'HW_ADDR', value: '$D011', kind: 'address' });
        expect(fields.some((field) => field.key.includes('PERF_DATA'))).toBe(false);
    });

    it('formats large numbers with separators', () => {
        const fields = describeNode(findNode(tree, 'clock') as InspectableData, noDebug);
        expect(fields).toContainEqual({ key: 'frequency', value: (1000000).toLocaleString(), kind: 'status' });
    });
});
