/**
 * Phase 4 (SDD) failing test for spec `debugger-exec-bar`.
 * AC-7 (flags surface): the CPU flag register must be labelled "Flags", not "Status"
 * — "Status" must not denote a second (or third) concept.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { IInspectableComponent } from '../../core/types/components';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { createMockWorkerManager } from '../../test-support/mocks/WorkerManager.mock';
import type { WorkerManager } from '../../services/WorkerManager';
import DebuggerLayout from '../DebuggerLayout';
import { WorkerDataProvider } from '../../contexts/WorkerDataContext';
import { EmulationProvider } from '../../contexts/EmulationContext';
import { DebuggerNavigationProvider } from '../../contexts/DebuggerNavigationContext';

// Mock the heavy/async child views so we render the Overview's CPU State panel only.
vi.mock('../DisassemblerPaginated', () => ({ __esModule: true, default: () => <div data-testid="disassembler" /> }));
vi.mock('../MemoryViewerPaginated', () => ({ __esModule: true, default: () => <div data-testid="memory" /> }));
vi.mock('../StackViewer', () => ({ __esModule: true, default: () => <div data-testid="stack" /> }));
vi.mock('../PerformanceMetrics', () => ({ __esModule: true, default: () => <div data-testid="perf" /> }));
vi.mock('../EngineSwitcher', () => ({ __esModule: true, default: () => <div data-testid="engine" /> }));

describe('DebuggerLayout CPU State panel', () => {
    let workerManager: WorkerManager;

    beforeEach(() => {
        workerManager = createMockWorkerManager();
        vi.clearAllMocks();
    });

    it('AC-7 (RENDER): labels the CPU flag register "Flags", not "Status"', () => {
        render(
            <WorkerDataProvider workerManager={workerManager}>
                <EmulationProvider workerManager={workerManager}>
                    <DebuggerNavigationProvider>
                        <DebuggerLayout
                            root={{} as IInspectableComponent}
                            workerManager={workerManager}
                            memoryViewAddress={0x0000}
                            setMemoryViewAddress={vi.fn()}
                            disassemblerAddress={0x0000}
                            setDisassemblerAddress={vi.fn()}
                        />
                    </DebuggerNavigationProvider>
                </EmulationProvider>
            </WorkerDataProvider>,
        );

        // The flag register is labelled "Flags" (its old "Status" label is gone).
        expect(screen.getByText(/Flags/i)).toBeInTheDocument();
    });
});
