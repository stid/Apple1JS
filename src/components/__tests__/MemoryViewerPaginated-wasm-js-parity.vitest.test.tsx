/**
 * MemoryViewer write-contract parity test (SDD: wasm-js-parity, AC-1).
 *
 * Confirm-only: the hex editor already commits edits by calling
 * workerManager.writeMemory(addr, value). The engine-divergence bug was in the
 * worker's write routing (covered by AC-6 in WorkerAPI-wasm-js-parity); this
 * test pins the UI contract so the edit path keeps reaching the worker.
 */

import { describe, expect, beforeEach, vi, type Mock } from 'vitest';
import { createMockWorkerManager } from '../../test-support/mocks/WorkerManager.mock';
import { render, screen, fireEvent, act, waitFor } from '../../test-utils/render';
import MemoryViewerPaginated from '../MemoryViewerPaginated';
import type { WorkerManager } from '../../services/WorkerManager';

describe('MemoryViewerPaginated — write contract', () => {
    let mockWorkerManager: WorkerManager;

    beforeEach(() => {
        mockWorkerManager = createMockWorkerManager();
        vi.clearAllMocks();
        (mockWorkerManager.getMemoryMap as Mock).mockResolvedValue({
            regions: [{ name: 'RAM', start: 0x0000, end: 0x0fff, type: 'RAM', writable: true }],
        });
        (mockWorkerManager.readMemoryRange as Mock).mockImplementation((start: number, length: number) =>
            Promise.resolve(new Array(length).fill(0).map((_, i) => (start + i) % 256)),
        );
    });

    it('AC-1 (RENDER): committing an edit routes through the engine write path', async () => {
        await act(async () => {
            render(<MemoryViewerPaginated workerManager={mockWorkerManager} startAddress={0x0000} />);
        });

        // Byte at $0005 renders as "05" (unique within the visible page).
        const cell = await screen.findByText('05');

        // The cell only becomes clickable once the (async) memory map marks the
        // region writable, so retry the click until the edit input appears. On
        // click the cell pre-fills the input with the current value ("05"); the
        // edit input is the textbox without the address-field placeholder.
        const editInput = await waitFor(() => {
            fireEvent.click(cell);
            const input = (screen.getAllByRole('textbox') as HTMLInputElement[]).find(
                (el) => el.getAttribute('placeholder') !== '0000',
            );
            if (!input) throw new Error('edit input not present yet');
            return input;
        });

        fireEvent.change(editInput, { target: { value: '7F' } });
        fireEvent.keyDown(editInput, { key: 'Enter' });

        expect(mockWorkerManager.writeMemory).toHaveBeenCalledWith(0x0005, 0x7f);
    });
});
