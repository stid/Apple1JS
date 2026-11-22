import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, within } from '../../test-utils/render';
import { createMockWorkerManager } from '../../test-support/mocks/WorkerManager.mock';
import type { WorkerManager } from '../../services/WorkerManager';
import type { InspectableData } from '../../core/types/components';
import BoardView from '../BoardView';

let mockDebugInfo: Record<string, unknown> = {};
const setDebuggerActive = vi.fn();
vi.mock('../../contexts/WorkerDataContext', () => ({
    useWorkerData: () => ({
        debugInfo: mockDebugInfo,
        setDebuggerActive,
        refreshDebugInfo: vi.fn(),
    }),
}));

const tree = {
    id: 'apple1',
    type: 'Apple1',
    name: 'Apple 1',
    children: [
        { id: 'cpu6502', type: 'CPU6502', name: '6502 CPU' },
        { id: 'bus', type: 'Bus', name: 'System bus', mappingCount: 4 },
        { id: 'rom', type: 'ROM', name: 'Monitor ROM', size: 256 },
        { id: 'ram1', type: 'RAM', name: 'RAM bank 1', size: 4096 },
        { id: 'ram2', type: 'RAM', name: 'RAM bank 2', size: 4096 },
        { id: 'pia6820', type: 'PIA6820', name: 'PIA 6820' },
        { id: 'clock', type: 'Clock', name: 'System clock', frequency: 1000000 },
        { id: 'video', type: 'IoComponent', name: 'Video Output', rows: 24 },
        { id: 'keyboard', type: 'IoComponent', name: 'Keyboard Input' },
    ],
} as InspectableData;

describe('BoardView', () => {
    let workerManager: WorkerManager;

    beforeEach(() => {
        workerManager = createMockWorkerManager();
    });

    afterEach(() => {
        vi.clearAllMocks();
        mockDebugInfo = {};
    });

    const renderBoard = (root: InspectableData = tree) =>
        render(<BoardView root={root} workerManager={workerManager} />);
    const detail = () => within(screen.getByRole('region', { name: 'Selected part' }));
    const part = (name: string) => screen.getByRole('button', { name });

    it('AC-2 (RENDER): each emulated part is a button and selecting it shows its node', () => {
        renderBoard();

        const expected: Array<[string, string, string]> = [
            ['MOS 6502', 'CPU6502', 'cpu6502'],
            ['74154', 'Bus', 'bus'],
            ['Monitor PROMs', 'ROM', 'rom'],
            ['RAM bank 1', 'RAM', 'ram1'],
            ['RAM bank 2', 'RAM', 'ram2'],
            ['MC6820 PIA', 'PIA6820', 'pia6820'],
            ['Clock', 'Clock', 'clock'],
            ['Video out', 'IoComponent', 'video'],
            ['Keyboard socket', 'IoComponent', 'keyboard'],
        ];
        for (const [label, type, id] of expected) {
            fireEvent.click(part(label));
            expect(detail().getByRole('heading', { name: label })).toBeInTheDocument();
            // The Clock's label and type are the same word, so allow more than one match.
            expect(detail().getAllByText(type).length).toBeGreaterThan(0);
            expect(detail().getByText(id)).toBeInTheDocument();
        }
    });

    it('AC-2 (RENDER): the detail lists config and live debug fields of the selected node', () => {
        mockDebugInfo = { pia: { KBDCR: '$27' }, cpu: { REG_PC: '$FF29' } };
        renderBoard();

        fireEvent.click(part('Monitor PROMs'));
        expect(detail().getByText('size:')).toBeInTheDocument();
        expect(detail().getByText('256')).toBeInTheDocument();

        fireEvent.click(part('MC6820 PIA'));
        expect(detail().getByText('KBDCR:')).toBeInTheDocument();
        expect(detail().getByText('$27')).toBeInTheDocument();
        // Another component's debug data must not leak into this one.
        expect(detail().queryByText('REG_PC:')).not.toBeInTheDocument();
    });

    it('AC-3 (RENDER): parts with no emulation are drawn but not interactive', () => {
        renderBoard();

        for (const label of ['expansion connector', 'prototyping area', 'LM323K']) {
            expect(screen.getByText(label)).toBeInTheDocument();
            expect(screen.queryByRole('button', { name: label })).not.toBeInTheDocument();
        }
    });

    it('starts with the CPU selected', () => {
        renderBoard();

        expect(part('MOS 6502')).toHaveAttribute('aria-pressed', 'true');
        expect(part('MC6820 PIA')).toHaveAttribute('aria-pressed', 'false');
        expect(detail().getByRole('heading', { name: 'MOS 6502' })).toBeInTheDocument();
    });

    it('selects every part that shares the node (the terminal section is one component)', () => {
        renderBoard();

        fireEvent.click(part('2513'));

        for (const label of ['2513', '2504 / 2519', 'TTL timing chain', 'Video out']) {
            expect(part(label)).toHaveAttribute('aria-pressed', 'true');
        }
        expect(part('Keyboard socket')).toHaveAttribute('aria-pressed', 'false');
        expect(detail().getByText('rows:')).toBeInTheDocument();
    });

    it('selects with the keyboard', () => {
        renderBoard();

        fireEvent.keyDown(part('Clock'), { key: 'Enter' });
        expect(part('Clock')).toHaveAttribute('aria-pressed', 'true');

        fireEvent.keyDown(part('RAM bank 1'), { key: ' ' });
        expect(part('RAM bank 1')).toHaveAttribute('aria-pressed', 'true');
        expect(part('Clock')).toHaveAttribute('aria-pressed', 'false');
    });

    it('says so when the running machine has no such component', () => {
        renderBoard({ id: 'apple1', type: 'Apple1', children: [] } as InspectableData);

        fireEvent.click(part('MC6820 PIA'));

        expect(detail().getByText('Not present in the running machine.')).toBeInTheDocument();
    });

    it('polls debug info only while it is on screen', () => {
        const { unmount } = renderBoard();
        expect(setDebuggerActive).toHaveBeenLastCalledWith(true);

        unmount();
        expect(setDebuggerActive).toHaveBeenLastCalledWith(false);
    });

    // Carried over from the Inspector (work-item wasm-js-parity): the CPU's hardware
    // fields must be the engine's values, not placeholders.
    it('AC-4 (RENDER): the CPU detail shows real hw/interrupt fields', () => {
        mockDebugInfo = { cpu: { HW_ADDR: '$1234', HW_DATA: '$AB', IRQ_PENDING: 'YES', NMI_PENDING: 'NO' } };
        renderBoard();

        expect(detail().getByText('HW_ADDR:')).toBeInTheDocument();
        expect(detail().getByText('$1234')).toBeInTheDocument();
        expect(detail().getByText('$AB')).toBeInTheDocument();
        expect(detail().getByText('IRQ_PENDING:')).toBeInTheDocument();
    });
});
