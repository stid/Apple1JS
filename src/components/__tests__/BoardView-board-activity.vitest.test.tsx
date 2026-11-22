import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '../../test-utils/render';
import { createMockWorkerManager } from '../../test-support/mocks/WorkerManager.mock';
import type { WorkerManager } from '../../services/WorkerManager';
import type { InspectableData } from '../../core/types/components';
import BoardView from '../BoardView';

vi.mock('../../contexts/WorkerDataContext', () => ({
    useWorkerData: () => ({ debugInfo: {}, setDebuggerActive: vi.fn(), refreshDebugInfo: vi.fn() }),
}));

type Counts = Record<'rom' | 'ram1' | 'ram2' | 'pia6820', [number, number]>;

/** The machine tree with an activity sample; a new object each call, as each poll delivers. */
const treeAt = (sampledAt: number, accesses: number, counts: Counts): InspectableData =>
    ({
        id: 'apple1',
        type: 'Apple1',
        name: 'Apple 1',
        children: [
            { id: 'cpu6502', type: 'CPU6502', name: '6502 CPU' },
            { id: 'bus', type: 'Bus', name: 'System bus' },
            { id: 'rom', type: 'ROM', name: 'Monitor ROM' },
            { id: 'ram1', type: 'RAM', name: 'RAM bank 1' },
            { id: 'ram2', type: 'RAM', name: 'RAM bank 2' },
            { id: 'pia6820', type: 'PIA6820', name: 'PIA 6820' },
            { id: 'clock', type: 'Clock', name: 'System clock' },
            { id: 'video', type: 'IoComponent', name: 'Video Output' },
            { id: 'keyboard', type: 'IoComponent', name: 'Keyboard Input' },
        ],
        activity: {
            sampledAt,
            accesses,
            parts: Object.fromEntries(Object.entries(counts).map(([id, [reads, writes]]) => [id, { reads, writes }])),
        },
    }) as InspectableData;

// Half a second apart. Idle monitor: PROMs and PIA busy, both RAM banks untouched.
const boot = treeAt(1000, 20_000, { rom: [15_000, 0], ram1: [900, 400], ram2: [0, 0], pia6820: [3000, 700] });
const idle = treeAt(1500, 270_000, { rom: [215_000, 0], ram1: [900, 400], ram2: [0, 0], pia6820: [53_000, 700] });
const basic = treeAt(2000, 520_000, {
    rom: [215_000, 0],
    ram1: [50_900, 20_400],
    ram2: [215_000, 0],
    pia6820: [53_000, 700],
});

const ADDRESSED = ['Monitor PROMs', 'RAM bank 1', 'RAM bank 2', 'MC6820 PIA'] as const;

describe('BoardView — live activity', () => {
    let workerManager: WorkerManager;

    beforeEach(() => {
        workerManager = createMockWorkerManager();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    /** Render one sample, then deliver the following ones the way the poll does. */
    const renderSamples = (first: InspectableData, ...rest: InspectableData[]) => {
        const view = render(<BoardView root={first} workerManager={workerManager} />);
        for (const next of rest) {
            view.rerender(<BoardView root={next} workerManager={workerManager} />);
        }
        return view;
    };
    const part = (name: string) => screen.getByRole('button', { name });
    const isLit = (element: Element) => element.getAttribute('data-active') === 'true';
    const trace = (container: HTMLElement, id: string) => {
        const element = container.querySelector(`[data-trace="${id}"]`);
        if (!element) throw new Error(`no trace ${id}`);
        return element;
    };

    it('AC-5 (RENDER): each bus-addressed part shows its read and write rate per second', () => {
        renderSamples(boot, idle);

        expect(part('Monitor PROMs')).toHaveTextContent('R 400k/s · W 0/s');
        expect(part('MC6820 PIA')).toHaveTextContent('R 100k/s · W 0/s');
        expect(part('RAM bank 1')).toHaveTextContent('R 0/s · W 0/s');
        expect(part('RAM bank 2')).toHaveTextContent('R 0/s · W 0/s');
        // Parts that are not on the address bus carry no rate.
        expect(part('MOS 6502')).not.toHaveTextContent('/s');
        expect(part('Clock')).not.toHaveTextContent('/s');
    });

    it('AC-6 (RENDER): accessed parts and their stubs are lit, with the CPU, the decoder and both trunks', () => {
        const { container } = renderSamples(boot, idle);

        expect(isLit(part('Monitor PROMs'))).toBe(true);
        expect(isLit(part('MC6820 PIA'))).toBe(true);
        expect(isLit(part('RAM bank 1'))).toBe(false);
        expect(isLit(part('MOS 6502'))).toBe(true);
        expect(isLit(part('74154'))).toBe(true);

        const lit = ['rom-address', 'rom-data', 'pia-address', 'pia-data', 'cpu-address', 'cpu-data'];
        const dark = ['ram1-address', 'ram1-data', 'ram2-address', 'ram2-data'];
        for (const id of [...lit, 'address-bus', 'data-bus', 'decoder-address', 'decoder-pia']) {
            expect(isLit(trace(container, id)), id).toBe(true);
        }
        for (const id of dark) {
            expect(isLit(trace(container, id)), id).toBe(false);
        }
    });

    it('AC-7 (RENDER): idle monitor lights CPU, PROMs and PIA and leaves the $E000 bank dark at zero; BASIC lights it', () => {
        const view = renderSamples(boot, idle);

        expect(isLit(part('MOS 6502'))).toBe(true);
        expect(isLit(part('Monitor PROMs'))).toBe(true);
        expect(isLit(part('MC6820 PIA'))).toBe(true);
        expect(isLit(part('RAM bank 2'))).toBe(false);
        expect(part('RAM bank 2')).toHaveTextContent('R 0/s · W 0/s');

        view.rerender(<BoardView root={basic} workerManager={workerManager} />);

        expect(isLit(part('RAM bank 2'))).toBe(true);
        expect(part('RAM bank 2')).toHaveTextContent('R 430k/s · W 0/s');
    });

    it('AC-8 (RENDER): while paused nothing is lit, rates read zero and the selection still shows', () => {
        const paused = treeAt(2000, 270_000, {
            rom: [215_000, 0],
            ram1: [900, 400],
            ram2: [0, 0],
            pia6820: [53_000, 700],
        });
        const { container } = renderSamples(boot, idle, paused);

        for (const name of [...ADDRESSED, 'MOS 6502', '74154']) {
            expect(isLit(part(name)), name).toBe(false);
        }
        for (const name of ADDRESSED) {
            expect(part(name)).toHaveTextContent('R 0/s · W 0/s');
        }
        expect(container.querySelectorAll('[data-trace][data-active="true"]')).toHaveLength(0);

        // Selection is independent of lighting, lit or dark.
        fireEvent.click(part('Monitor PROMs'));
        expect(part('Monitor PROMs')).toHaveAttribute('aria-pressed', 'true');
    });

    it('AC-8 (RENDER): a lit part still reads as selected', () => {
        renderSamples(boot, idle);

        fireEvent.click(part('Monitor PROMs'));

        expect(isLit(part('Monitor PROMs'))).toBe(true);
        expect(part('Monitor PROMs')).toHaveAttribute('aria-pressed', 'true');
        expect(part('MC6820 PIA')).toHaveAttribute('aria-pressed', 'false');
    });

    it('AC-9 (RENDER): a counter that goes backwards shows no rate instead of a negative one or a spike', () => {
        const afterReset = treeAt(2000, 900, { rom: [800, 0], ram1: [0, 0], ram2: [0, 0], pia6820: [100, 0] });
        const view = renderSamples(boot, idle, afterReset);

        for (const name of ADDRESSED) {
            expect(part(name)).toHaveTextContent('R — · W —');
            expect(part(name)).not.toHaveTextContent(/[RW] -/);
            expect(isLit(part(name)), name).toBe(false);
        }

        // The sample after that one is measured against the post-reset counts.
        const next = treeAt(2500, 200_900, { rom: [150_800, 0], ram1: [0, 0], ram2: [0, 0], pia6820: [50_100, 0] });
        view.rerender(<BoardView root={next} workerManager={workerManager} />);
        expect(part('Monitor PROMs')).toHaveTextContent('R 300k/s · W 0/s');
    });

    it('AC-9 (RENDER): the first sample shows no rate', () => {
        renderSamples(idle);

        expect(part('Monitor PROMs')).toHaveTextContent('R — · W —');
        expect(isLit(part('Monitor PROMs'))).toBe(false);
    });

    it('AC-10 (RENDER): the rate text is there lit or dark, the legend names the lit state, and nothing animates without a reduced-motion opt-out', () => {
        const { container } = renderSamples(boot, idle);

        for (const name of ADDRESSED) {
            expect(part(name)).toHaveTextContent(/R \S+ · W \S+/);
        }
        expect(screen.getByText('in use')).toBeInTheDocument();

        const animated = [...container.querySelectorAll('svg *')].filter((element) => {
            const classes = element.getAttribute('class') ?? '';
            return /(^|\s)(animate-|transition)/.test(classes) && !classes.includes('motion-reduce:');
        });
        expect(animated).toHaveLength(0);
    });
});
