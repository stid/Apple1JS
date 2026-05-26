import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createMockWorkerManager } from '../../test-support/mocks/WorkerManager.mock';
import type { WorkerManager } from '../../services/WorkerManager';
import EngineSwitcher from '../EngineSwitcher';

describe('EngineSwitcher loading indicator', () => {
    let wm: WorkerManager;
    beforeEach(() => {
        wm = createMockWorkerManager();
        vi.clearAllMocks();
        vi.mocked(wm.getEngineStatus).mockResolvedValue({
            currentEngine: 'JS',
            availableEngines: ['JS', 'WASM'],
            switchCount: 0,
            lastSwitchTime: 0,
        });
    });

    it('shows a spinner while a switch is in flight', async () => {
        // Keep the switch pending so the switching state stays observable.
        vi.mocked(wm.switchEngine).mockReturnValue(new Promise(() => {}));
        render(<EngineSwitcher workerManager={wm} />);

        const wasmBtn = await screen.findByRole('button', { name: /WASM Engine/i });
        expect(screen.queryByTestId('spinner')).toBeNull();
        fireEvent.click(wasmBtn);
        await waitFor(() => expect(screen.getByTestId('spinner')).toBeInTheDocument());
    });
});
