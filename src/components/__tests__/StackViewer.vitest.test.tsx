import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import StackViewer from '../StackViewer';
import { createMockWorkerManager } from '../../test-support/mocks/WorkerManager.mock';
import type { WorkerManager } from '../../services/WorkerManager';

vi.mock('../AddressLink', () => ({
    default: ({ address }: { address: number }) => (
        <span data-testid="stack-address">{address.toString(16).toUpperCase().padStart(4, '0')}</span>
    ),
}));

describe('StackViewer', () => {
    let workerManager: WorkerManager;

    beforeEach(() => {
        workerManager = createMockWorkerManager();
        // Page 1 filled with a recognisable pattern: value = low byte of the address.
        vi.mocked(workerManager.readMemoryRange).mockResolvedValue(Array.from({ length: 0x100 }, (_, i) => i));
    });

    const addresses = () => screen.queryAllByTestId('stack-address').map((el) => el.textContent);

    it('shows an empty stack when S sits at the base, however low S is', async () => {
        // Idle Woz Monitor after a reset that left S at $0B: nothing has been pushed.
        render(<StackViewer workerManager={workerManager} stackPointer={0x0b} stackBase={0x0b} />);
        await waitFor(() => expect(workerManager.readMemoryRange).toHaveBeenCalled());

        expect(screen.getByTestId('stack-depth')).toHaveTextContent('0 bytes');
        expect(screen.getByText('Stack is empty')).toBeInTheDocument();
        expect(addresses()).toEqual([]);
    });

    it('lists only the pushed bytes, from the top of stack (S+1) up to the base', async () => {
        render(<StackViewer workerManager={workerManager} stackPointer={0x09} stackBase={0x0b} />);

        expect(screen.getByTestId('stack-depth')).toHaveTextContent('2 bytes');
        // $0109 is the next free slot, not stack content.
        expect(addresses()).toEqual(['010A', '010B']);
        await waitFor(() => expect(screen.getByTestId('stack-top')).toHaveTextContent('0A'));
        expect(screen.getByTestId('stack-top')).toHaveTextContent('010A');
    });

    it('reports the depth as unknown when no base is available', () => {
        render(<StackViewer workerManager={workerManager} stackPointer={0x09} />);

        expect(screen.getByTestId('stack-depth')).toHaveTextContent('unknown');
        expect(addresses()).toEqual([]);
    });

    it('keeps the entry list in its own capped scroll area', () => {
        render(<StackViewer workerManager={workerManager} stackPointer={0x00} stackBase={0xff} />);

        expect(addresses()).toHaveLength(255);
        expect(screen.getByTestId('stack-entries')).toHaveClass('overflow-auto', 'max-h-80');
    });
});
