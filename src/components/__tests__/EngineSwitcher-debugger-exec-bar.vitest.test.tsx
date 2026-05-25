/**
 * Phase 4 (SDD) failing test for spec `debugger-exec-bar`.
 * AC-7 (engine surface): the engine panel must not label the active engine "Status"
 * — "Status" is reserved for run-state and must not denote a second concept.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createMockWorkerManager } from '../../test-support/mocks/WorkerManager.mock';
import type { WorkerManager } from '../../services/WorkerManager';
import EngineSwitcher from '../EngineSwitcher';

describe('EngineSwitcher', () => {
    let workerManager: WorkerManager;

    beforeEach(() => {
        workerManager = createMockWorkerManager();
        vi.clearAllMocks();
    });

    it('AC-7 (RENDER): does not label the engine "Status"', async () => {
        render(<EngineSwitcher workerManager={workerManager} />);
        // Wait until the engine panel has loaded its (mocked) status.
        await waitFor(() => expect(screen.getByText(/Switch Count/i)).toBeInTheDocument());
        // The word "Status" must not be used here — it belongs to run-state only.
        expect(screen.queryByText(/Status/i)).toBeNull();
    });
});
