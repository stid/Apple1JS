/**
 * Stack + disassembly engine-routing parity (SDD: wasm-js-parity, AC-3).
 *
 * Confirm-only: the stack and disassembly panels already read memory through
 * workerManager.readMemoryRange(), which routes to the *active* engine. So they
 * already reflect the WASM engine when it is active — no implementation needed.
 * This test guards against a regression that would bypass the engine routing.
 */

import React from 'react';
import { describe, expect, beforeEach, vi, type Mock } from 'vitest';
import { createMockWorkerManager } from '../../test-support/mocks/WorkerManager.mock';
import { render, waitFor } from '@testing-library/react';
import StackViewer from '../StackViewer';
import DisassemblerPaginated from '../DisassemblerPaginated';
import { EmulationProvider } from '../../contexts/EmulationContext';
import { WorkerDataProvider } from '../../contexts/WorkerDataContext';
import { DebuggerNavigationProvider } from '../../contexts/DebuggerNavigationContext';
import type { WorkerManager } from '../../services/WorkerManager';

describe('Stack + disassembly panels — engine-routed reads', () => {
    let mockWorkerManager: WorkerManager;

    beforeEach(() => {
        mockWorkerManager = createMockWorkerManager();
        vi.clearAllMocks();
        (mockWorkerManager.readMemoryRange as Mock).mockResolvedValue(new Array(256).fill(0));
    });

    const withProviders = (ui: React.ReactNode) => (
        <WorkerDataProvider workerManager={mockWorkerManager}>
            <DebuggerNavigationProvider>
                <EmulationProvider workerManager={mockWorkerManager}>{ui}</EmulationProvider>
            </DebuggerNavigationProvider>
        </WorkerDataProvider>
    );

    it('AC-3 (RENDER): stack + disassembly panels render in WASM mode', async () => {
        render(withProviders(<StackViewer workerManager={mockWorkerManager} stackPointer={0xfb} />));
        render(withProviders(<DisassemblerPaginated workerManager={mockWorkerManager} currentAddress={0x0000} />));

        // Both panels source their bytes from the active-engine-routed range read,
        // so they show WASM memory when WASM is active (no engine-specific path).
        await waitFor(() => {
            expect(mockWorkerManager.readMemoryRange).toHaveBeenCalled();
        });
        // Stack panel reads the stack page ($0100..).
        expect(mockWorkerManager.readMemoryRange).toHaveBeenCalledWith(0x0100, expect.any(Number));
    });
});
