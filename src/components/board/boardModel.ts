/**
 * The Apple 1 board as data: where each part sits, which node of the machine's
 * inspectable tree stands behind it, and how to turn a node into rows of fields.
 *
 * The layout is stylised, not the physical board. Coordinates are in the SVG's
 * own units (see BOARD_SIZE); the view scales the drawing to the space it has.
 */
import type { InspectableData } from '../../core/types/components';
import type { FilteredDebugData } from '../../apple1/types/worker-messages';

export const BOARD_SIZE = { width: 968, height: 664 } as const;

/** chip: a DIP package; connector: a socket or jack; dim: on the real board, not emulated. */
export type BoardPartKind = 'chip' | 'connector' | 'dim';

export interface BoardPart {
    id: string;
    kind: BoardPartKind;
    label: string;
    /** Second line: what the part is, or how the emulator models it. */
    detail?: string;
    /** Address range the part answers to, shown in the address colour. */
    address?: string;
    /** Id of the inspectable node behind this part. Absent for parts with no emulation. */
    nodeId?: string;
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface BoardRegion {
    id: string;
    label: string;
    /** One line under the region's parts. */
    note?: string;
    x: number;
    y: number;
    w: number;
    h: number;
    /** Not emulated: drawn as a dashed outline instead of a filled band. */
    dim?: boolean;
}

export interface BoardTrace {
    id: string;
    bus: 'address' | 'data' | 'control';
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    /** The bus itself, as opposed to a stub from a part to the bus. */
    trunk?: boolean;
}

export const BOARD_REGIONS: readonly BoardRegion[] = [
    { id: 'power', label: 'power supply', x: 16, y: 16, w: 300, h: 96, dim: true },
    {
        id: 'terminal',
        label: 'terminal section',
        note: 'Modelled as one component. Selecting any part selects the whole group.',
        x: 16,
        y: 128,
        w: 936,
        h: 148,
    },
    { id: 'processor', label: 'processor section', x: 16, y: 292, w: 936, h: 356 },
];

export const BOARD_PARTS: readonly BoardPart[] = [
    { id: 'regulator-5v', kind: 'dim', label: 'LM323K', detail: '+5 V', x: 28, y: 56, w: 100, h: 40 },
    { id: 'regulators', kind: 'dim', label: 'regulators', detail: '±12 V, −5 V', x: 136, y: 56, w: 168, h: 40 },
    { id: 'expansion', kind: 'dim', label: 'expansion connector', detail: '44 pin', x: 332, y: 16, w: 620, h: 40 },
    {
        id: 'keyboard-socket',
        kind: 'connector',
        label: 'Keyboard socket',
        detail: 'PIA port A',
        nodeId: 'keyboard',
        x: 332,
        y: 64,
        w: 196,
        h: 48,
    },
    {
        id: 'video-out',
        kind: 'connector',
        label: 'Video out',
        detail: 'PIA port B',
        nodeId: 'video',
        x: 544,
        y: 64,
        w: 196,
        h: 48,
    },
    { id: 'prototyping', kind: 'dim', label: 'prototyping area', x: 756, y: 64, w: 196, h: 48 },

    {
        id: 'char-rom',
        kind: 'chip',
        label: '2513',
        detail: 'character generator ROM',
        nodeId: 'video',
        x: 28,
        y: 164,
        w: 292,
        h: 64,
    },
    {
        id: 'display-memory',
        kind: 'chip',
        label: '2504 / 2519',
        detail: 'display memory, shift registers',
        nodeId: 'video',
        x: 336,
        y: 164,
        w: 292,
        h: 64,
    },
    {
        id: 'video-timing',
        kind: 'chip',
        label: 'TTL timing chain',
        detail: 'counters, cursor, video sync',
        nodeId: 'video',
        x: 644,
        y: 164,
        w: 296,
        h: 64,
    },

    {
        id: 'clock',
        kind: 'connector',
        label: 'Clock',
        detail: 'crystal + dividers',
        nodeId: 'clock',
        x: 28,
        y: 332,
        w: 148,
        h: 72,
    },
    { id: 'cpu', kind: 'chip', label: 'MOS 6502', detail: 'CPU', nodeId: 'cpu6502', x: 208, y: 332, w: 240, h: 72 },
    {
        id: 'decoder',
        kind: 'chip',
        label: '74154',
        detail: 'address decoder, modelled by Bus',
        nodeId: 'bus',
        x: 480,
        y: 332,
        w: 176,
        h: 72,
    },
    {
        id: 'pia',
        kind: 'chip',
        label: 'MC6820 PIA',
        detail: 'keyboard and display I/O',
        address: '$D010–$D013',
        nodeId: 'pia6820',
        x: 704,
        y: 332,
        w: 236,
        h: 72,
    },
    {
        id: 'ram1',
        kind: 'chip',
        label: 'RAM bank 1',
        detail: '8 × 4K-bit DRAM',
        address: '$0000–$0FFF',
        nodeId: 'ram1',
        x: 208,
        y: 520,
        w: 232,
        h: 72,
    },
    {
        id: 'ram2',
        kind: 'chip',
        label: 'RAM bank 2',
        detail: '8 × 4K-bit DRAM',
        address: '$E000–$EFFF',
        nodeId: 'ram2',
        x: 456,
        y: 520,
        w: 232,
        h: 72,
    },
    {
        id: 'rom',
        kind: 'chip',
        label: 'Monitor PROMs',
        detail: '2 × 256×4, wozmon',
        address: '$FF00–$FFFF',
        nodeId: 'rom',
        x: 704,
        y: 520,
        w: 236,
        h: 72,
    },
];

const ADDRESS_Y = 444;
const DATA_Y = 476;
const ROW1_BOTTOM = 404;
const ROW2_TOP = 520;

const stub = (id: string, bus: 'address' | 'data', x: number, toRow2 = false): BoardTrace => {
    const busY = bus === 'address' ? ADDRESS_Y : DATA_Y;
    return toRow2
        ? { id, bus, x1: x, y1: busY, x2: x, y2: ROW2_TOP }
        : { id, bus, x1: x, y1: ROW1_BOTTOM, x2: x, y2: busY };
};

export const BOARD_TRACES: readonly BoardTrace[] = [
    { id: 'address-bus', bus: 'address', x1: 208, y1: ADDRESS_Y, x2: 940, y2: ADDRESS_Y, trunk: true },
    { id: 'data-bus', bus: 'data', x1: 208, y1: DATA_Y, x2: 940, y2: DATA_Y, trunk: true },
    { id: 'clock-cpu', bus: 'control', x1: 176, y1: 368, x2: 208, y2: 368 },
    { id: 'decoder-pia', bus: 'control', x1: 656, y1: 368, x2: 704, y2: 368 },
    stub('cpu-address', 'address', 280),
    stub('cpu-data', 'data', 376),
    stub('decoder-address', 'address', 568),
    stub('pia-address', 'address', 768),
    stub('pia-data', 'data', 872),
    stub('ram1-address', 'address', 268, true),
    stub('ram1-data', 'data', 348, true),
    stub('ram2-address', 'address', 516, true),
    stub('ram2-data', 'data', 596, true),
    stub('rom-address', 'address', 764, true),
    stub('rom-data', 'data', 852, true),
];

export const BUS_LABELS = [
    { bus: 'address', label: 'address bus · A0–A15', x: 28, y: ADDRESS_Y + 4 },
    { bus: 'data', label: 'data bus · D0–D7', x: 28, y: DATA_Y + 4 },
] as const;

type Scalar = string | number | boolean;
const isScalar = (value: unknown): value is Scalar =>
    typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';

const IDENTITY_KEYS = new Set(['id', 'type', 'name', 'children', 'mapping']);

const configOf = (node: InspectableData): Array<[string, Scalar]> =>
    Object.entries(node).filter(
        (entry): entry is [string, Scalar] => !IDENTITY_KEYS.has(entry[0]) && isScalar(entry[1]),
    );

/**
 * Find a node by id anywhere in the tree. The same id can appear twice (the Bus
 * lists each mapped component again), so the copy with the most fields wins.
 */
export function findNode(root: InspectableData, id: string): InspectableData | undefined {
    let best: InspectableData | undefined;
    let bestSize = -1;
    const visit = (node: InspectableData): void => {
        if (node.id === id) {
            const size = configOf(node).length;
            if (size > bestSize) {
                best = node;
                bestSize = size;
            }
        }
        const children = Array.isArray(node.children) ? node.children : [];
        for (const child of children) {
            visit(child as InspectableData);
            if (child.component) {
                visit(child.component);
            }
        }
    };
    visit(root);
    return best;
}

export type FieldKind = 'address' | 'value' | 'flag' | 'status';

export interface NodeField {
    key: string;
    value: string;
    kind: FieldKind;
}

const DEBUG_DOMAIN: Record<string, keyof FilteredDebugData> = {
    CPU: 'cpu',
    CPU6502: 'cpu',
    PIA6820: 'pia',
    Bus: 'Bus',
    Clock: 'clock',
};

/** Live debug values for a node, with nested groups flattened to `GROUP_KEY`. */
function debugFieldsOf(node: InspectableData, debugInfo: FilteredDebugData): Array<[string, Scalar]> {
    const domain = DEBUG_DOMAIN[node.type];
    const data = domain ? (debugInfo[domain] as Record<string, unknown> | undefined) : undefined;
    if (!data) {
        return [];
    }
    const fields: Array<[string, Scalar]> = [];
    for (const [key, value] of Object.entries(data)) {
        // Profiling results have their own home in the Performance view.
        if (key === '_PERF_DATA') {
            continue;
        }
        if (isScalar(value)) {
            fields.push([key, value]);
        } else if (typeof value === 'object' && value !== null) {
            for (const [subKey, subValue] of Object.entries(value)) {
                if (isScalar(subValue)) {
                    fields.push([`${key}_${subKey}`, subValue]);
                }
            }
        }
    }
    return fields;
}

function debugKind(key: string): FieldKind {
    if (key.includes('ADDR') || key.includes('Address')) return 'address';
    if (key.includes('FLAG') || key.includes('Flag')) return 'flag';
    if (key.includes('REG_') || key.includes('DATA')) return 'value';
    return 'status';
}

function formatValue(key: string, value: Scalar): string {
    if (typeof value === 'number') {
        if (key === 'drift' || key === 'actualFrequency') {
            return value.toFixed(2);
        }
        if (value > 999) {
            return value.toLocaleString();
        }
    }
    return String(value);
}

/**
 * Everything worth showing about a node: its static config, then its live debug
 * values. A debug value replaces a config field of the same name.
 */
export function describeNode(node: InspectableData, debugInfo: FilteredDebugData): NodeField[] {
    const debug = new Map(debugFieldsOf(node, debugInfo));
    const config = configOf(node).filter(([key]) => !debug.has(key));
    return [
        ...config.map(([key, value]) => ({ key, value: formatValue(key, value), kind: 'status' as const })),
        ...[...debug].map(([key, value]) => ({ key, value: formatValue(key, value), kind: debugKind(key) })),
    ];
}
