/**
 * Live activity on the Board: turns two consecutive samples of the machine's
 * bus-access counters into read/write rates and a lit or dark state per part.
 *
 * The counters live in the CPU engines and arrive on the root of the machine
 * tree (`activity`), which the Board already polls.
 */
import type { BoardActivitySample } from '../../apple1/types/worker-messages';
import type { InspectableData } from '../../core/types/components';
import type { BoardPart, BoardTrace } from './boardModel';

export interface PartActivity {
    readsPerSecond: number;
    writesPerSecond: number;
    /** At least one access in the interval. */
    active: boolean;
}

export interface BoardActivity {
    /** The CPU made at least one bus access, mapped or not. */
    cpuActive: boolean;
    /** At least one part answered. */
    busActive: boolean;
    /** Keyed by inspectable node id. */
    parts: Record<string, PartActivity>;
}

/** The activity sample on the tree root, if the worker sent a well-formed one. */
export function readActivitySample(root: InspectableData): BoardActivitySample | undefined {
    const candidate = root.activity as Partial<BoardActivitySample> | undefined;
    if (
        typeof candidate !== 'object' ||
        candidate === null ||
        typeof candidate.sampledAt !== 'number' ||
        typeof candidate.accesses !== 'number' ||
        typeof candidate.parts !== 'object' ||
        candidate.parts === null
    ) {
        return undefined;
    }
    return candidate as BoardActivitySample;
}

/**
 * Rates between two samples. Returns null when there is nothing honest to show:
 * no earlier sample, no time between them, or a counter that went backwards (a
 * reset, a state load or an engine switch restarted the counts).
 */
export function computeBoardActivity(
    previous: BoardActivitySample | undefined,
    current: BoardActivitySample | undefined,
): BoardActivity | null {
    if (!previous || !current) {
        return null;
    }
    const seconds = (current.sampledAt - previous.sampledAt) / 1000;
    if (seconds <= 0 || current.accesses < previous.accesses) {
        return null;
    }

    const parts: Record<string, PartActivity> = {};
    let busActive = false;
    for (const [id, now] of Object.entries(current.parts)) {
        const before = previous.parts[id] ?? { reads: 0, writes: 0 };
        const reads = now.reads - before.reads;
        const writes = now.writes - before.writes;
        if (reads < 0 || writes < 0) {
            return null;
        }
        const active = reads + writes > 0;
        busActive = busActive || active;
        parts[id] = { readsPerSecond: reads / seconds, writesPerSecond: writes / seconds, active };
    }
    return { cpuActive: current.accesses > previous.accesses, busActive, parts };
}

/** `412k/s`: at about 1 MHz the raw numbers are six digits. */
export function formatRate(perSecond: number): string {
    if (perSecond < 999.5) {
        return `${Math.round(perSecond)}/s`;
    }
    const [scaled, unit] = perSecond < 999_500 ? [perSecond / 1000, 'k'] : [perSecond / 1_000_000, 'M'];
    return `${scaled < 10 ? scaled.toFixed(1) : Math.round(scaled)}${unit}/s`;
}

/** The rate line of a bus-addressed part, or undefined for parts off the address bus. */
export function rateLabel(
    sample: BoardActivitySample | undefined,
    activity: BoardActivity | null,
    part: BoardPart,
): string | undefined {
    if (!part.nodeId || !sample || !(part.nodeId in sample.parts)) {
        return undefined;
    }
    const rates = activity?.parts[part.nodeId];
    return rates
        ? `R ${formatRate(rates.readsPerSecond)} · W ${formatRate(rates.writesPerSecond)}`
        : 'R — · W —';
}

/** Lit: the CPU while it runs, the decoder while any part answers, a part while it is accessed. */
export function isPartActive(activity: BoardActivity | null, part: BoardPart): boolean {
    if (!activity) {
        return false;
    }
    if (part.id === 'cpu') {
        return activity.cpuActive;
    }
    if (part.id === 'decoder') {
        return activity.busActive;
    }
    return part.nodeId ? (activity.parts[part.nodeId]?.active ?? false) : false;
}

/** A trace is lit with the part it serves; the two trunks with the bus as a whole. */
export function isTraceActive(activity: BoardActivity | null, trace: BoardTrace, parts: readonly BoardPart[]): boolean {
    if (!activity) {
        return false;
    }
    if (trace.trunk) {
        return activity.busActive;
    }
    const part = parts.find((candidate) => candidate.id === trace.part);
    return part ? isPartActive(activity, part) : false;
}
