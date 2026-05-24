/**
 * InspectorView WASM/JS parity tests (SDD: wasm-js-parity).
 *
 * AC-2: profiling toggle is enabled & operable when the WASM engine is active.
 * AC-4: hardware/interrupt fields reflect engine state (not placeholders).
 * AC-5: no degradation banner when the WASM engine is active.
 *
 * The inspector reads CPU debug data from WorkerDataContext and the active
 * engine from workerManager.getEngineStatus(). Here we force the WASM engine
 * active and assert the inspector is at parity with the JS engine.
 */

import React from 'react';
import { describe, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { createMockWorkerManager } from '../../test-support/mocks/WorkerManager.mock';
import type { WorkerManager } from '../../services/WorkerManager';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '../../test-utils/render';
import InspectorView from '../InspectorView';
import { IInspectableComponent } from '../../core/types/components';

let mockDebugInfo: Record<string, unknown> = {};
vi.mock('../../contexts/WorkerDataContext', () => ({
    useWorkerData: () => ({
        debugInfo: mockDebugInfo,
        breakpoints: [],
        subscribeToDebugInfo: vi.fn(() => () => {}),
        subscribeToBreakpoints: vi.fn(() => () => {}),
        subscribeToMemoryRange: vi.fn(() => () => {}),
        setDebuggerActive: vi.fn(),
        refreshDebugInfo: vi.fn(),
        refreshBreakpoints: vi.fn(),
        refreshMemoryRange: vi.fn(),
    }),
    WorkerDataProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockInspectable: IInspectableComponent = {
    id: 'test-root',
    type: 'Apple1',
    getInspectable: vi.fn().mockReturnValue({ id: 'test-root', type: 'Apple1', name: 'Test', children: [] }),
};

describe('InspectorView — WASM engine parity', () => {
    let mockWorkerManager: WorkerManager;

    beforeEach(() => {
        mockWorkerManager = createMockWorkerManager();
        (mockWorkerManager.setCpuProfiling as Mock).mockResolvedValue(undefined);
        // Force the WASM engine to be the active engine.
        (mockWorkerManager.getEngineStatus as Mock).mockResolvedValue({
            currentEngine: 'WASM',
            availableEngines: ['JS', 'WASM'],
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
        mockDebugInfo = {};
    });

    const renderInspector = () => render(<InspectorView root={mockInspectable} workerManager={mockWorkerManager} />);

    it('AC-2 (RENDER): profiling toggle enabled in WASM mode', async () => {
        renderInspector();
        // Wait for the async engine-status fetch to mark WASM active.
        await screen.findByText('CPU Performance Profiling');

        const toggle = screen.getByRole('button', { name: /Profiling/i });
        // Parity with the JS engine: the button is operable, not a disabled
        // "WASM (No Profiling)" placeholder.
        expect(toggle).toBeEnabled();
        expect(toggle).not.toHaveTextContent(/No Profiling/i);
    });

    it('AC-4 (RENDER): inspector shows real hw/interrupt fields in WASM mode', async () => {
        mockDebugInfo = {
            cpu: {
                HW_ADDR: '$1234',
                HW_DATA: '$AB',
                IRQ_PENDING: 'YES',
                NMI_PENDING: 'NO',
            },
        };
        renderInspector();
        await screen.findByText('CPU Performance Profiling');

        expect(screen.getAllByText('HW_ADDR:').length).toBeGreaterThanOrEqual(1);
        // The engine-provided values must be reflected, not fixed placeholders.
        expect(screen.getByText('$1234')).toBeInTheDocument();
        expect(screen.getByText('$AB')).toBeInTheDocument();
    });

    it('AC-5 (RENDER): no degradation banner in WASM mode', async () => {
        renderInspector();
        await screen.findByText('CPU Performance Profiling');

        expect(screen.queryByText(/WASM engine active/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/limited support/i)).not.toBeInTheDocument();
    });
});
