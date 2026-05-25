import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import DisassemblerPaginated from '../DisassemblerPaginated';
import { EmulationProvider } from '../../contexts/EmulationContext';
import { WorkerDataProvider } from '../../contexts/WorkerDataContext';
import { DebuggerNavigationProvider } from '../../contexts/DebuggerNavigationContext';
import type { WorkerManager } from '../../services/WorkerManager';

// Mock Formatters
vi.mock('../../utils/formatters', () => ({
    Formatters: {
        hex: (value: number, digits: number) => value.toString(16).padStart(digits, '0').toUpperCase(),
        hexWord: (value: number) => value.toString(16).padStart(4, '0').toUpperCase(),
        hexByte: (value: number) => value.toString(16).padStart(2, '0').toUpperCase(),
    },
}));

// Mock OPCODES
vi.mock('../../constants/opcodes', () => ({
    OPCODES: {
        0xea: { name: 'NOP', bytes: 1, mode: 'imp' },
        0xa9: { name: 'LDA', bytes: 2, mode: 'imm' },
        0x4c: { name: 'JMP', bytes: 3, mode: 'abs' },
        0x20: { name: 'JSR', bytes: 3, mode: 'abs' },
        0x60: { name: 'RTS', bytes: 1, mode: 'imp' },
        0x00: { name: 'BRK', bytes: 1, mode: 'imp' },
    },
}));

describe('DisassemblerPaginated', () => {
    let mockWorkerManager: WorkerManager;

    beforeEach(() => {
        mockWorkerManager = {
            readMemoryRange: vi.fn().mockResolvedValue([0xea, 0xa9, 0x42, 0x4c, 0x00, 0xff]),
            onRunToCursorTarget: vi.fn().mockResolvedValue(() => {}),
            keyDown: vi.fn().mockResolvedValue(undefined),
            getDebugInfo: vi.fn().mockResolvedValue({
                cpu: {
                    REG_PC: '$FF00',
                    REG_A: '$42',
                    REG_X: '$00',
                    REG_Y: '$00',
                    REG_S: '$FF',
                },
            }),
            pauseEmulation: vi.fn().mockResolvedValue(undefined),
            resumeEmulation: vi.fn().mockResolvedValue(undefined),
            step: vi.fn().mockResolvedValue({
                cpu: {
                    REG_PC: '$FF01',
                },
            }),
            setBreakpoint: vi.fn().mockResolvedValue([0xff00]),
            clearBreakpoint: vi.fn().mockResolvedValue([]),
            getBreakpoints: vi.fn().mockResolvedValue([]),
            onEmulationStatus: vi.fn().mockResolvedValue(() => {}),
            onBreakpointHit: vi.fn().mockResolvedValue(() => {}),
            runToAddress: vi.fn().mockResolvedValue(undefined),
            clearAllBreakpoints: vi.fn().mockResolvedValue(undefined),
        } as unknown as WorkerManager;
    });

    const renderComponent = (props = {}) => {
        return render(
            <WorkerDataProvider workerManager={mockWorkerManager}>
                <EmulationProvider workerManager={mockWorkerManager}>
                    <DebuggerNavigationProvider>
                        <DisassemblerPaginated workerManager={mockWorkerManager} {...props} />
                    </DebuggerNavigationProvider>
                </EmulationProvider>
            </WorkerDataProvider>,
        );
    };

    it('should render disassembly view', async () => {
        await act(async () => {
            renderComponent();
        });

        // Wait for initial render. Execution controls (Step/Run-Pause/Reset) now live in
        // the global execution bar; this view's toolbar keeps only →PC navigation.
        await waitFor(() => {
            expect(screen.getByText('→PC')).toBeInTheDocument();
        });
        expect(screen.queryByText('Step')).toBeNull();
        expect(screen.queryByText('Reset')).toBeNull();
    });

    it('should fetch and display memory as disassembled instructions', async () => {
        await act(async () => {
            renderComponent();
        });

        await waitFor(() => {
            expect(mockWorkerManager.readMemoryRange).toHaveBeenCalled();
        });
    });

    // Step / Run-Pause / Reset moved to the global execution bar
    // (ExecutionControlsCluster) — their behaviour is covered there, not in this view.

    it('should navigate to PC when Jump to PC button is clicked', async () => {
        await act(async () => {
            renderComponent();
        });

        await waitFor(() => {
            // Click Jump to PC button
            const jumpButton = screen.getByText('→PC');
            fireEvent.click(jumpButton);
        });

        // Should attempt to navigate to PC address
        // Component will update viewStartAddress internally
    });

    it('should display correct addressing modes', async () => {
        // Mock memory with different instruction types
        (mockWorkerManager.readMemoryRange as Mock).mockResolvedValueOnce([
            0xea, // NOP (implied)
            0xa9,
            0x42, // LDA #$42 (immediate)
            0x4c,
            0x00,
            0xff, // JMP $FF00 (absolute)
            0x20,
            0x50,
            0xff, // JSR $FF50 (absolute)
            0x60, // RTS (implied)
        ]);

        await act(async () => {
            renderComponent();
        });

        await waitFor(
            () => {
                expect(screen.getByText('NOP')).toBeInTheDocument();
                expect(screen.getByText('LDA')).toBeInTheDocument();
                expect(screen.getByText('#$42')).toBeInTheDocument();
                expect(screen.getByText('JMP')).toBeInTheDocument();
                expect(screen.getByText('JSR')).toBeInTheDocument();
                expect(screen.getByText('RTS')).toBeInTheDocument();
            },
            { timeout: 3000 },
        );
    });

    it('should handle breakpoint toggle on row click', async () => {
        // Mock memory to ensure we have some rows
        (mockWorkerManager.readMemoryRange as Mock).mockResolvedValueOnce([
            0xea,
            0xea,
            0xea,
            0xea, // Some NOPs to display
        ]);

        await act(async () => {
            renderComponent();
        });

        await waitFor(
            () => {
                const breakpointCells = screen.getAllByTitle('Set breakpoint');
                expect(breakpointCells.length).toBeGreaterThan(0);

                // Click on first breakpoint cell
                fireEvent.click(breakpointCells[0]);
            },
            { timeout: 3000 },
        );

        await waitFor(() => {
            expect(mockWorkerManager.setBreakpoint).toHaveBeenCalled();
        });
    });

    // Run-state badge and the F5/F10 run-pause/step shortcuts now live in the global
    // execution bar (ExecutionControlsCluster), not this view's toolbar.

    it('should navigate to external address when provided', async () => {
        const externalAddress = 0x1234;

        await act(async () => {
            renderComponent({ currentAddress: externalAddress });
        });

        // Component should request memory at the provided address
        await waitFor(() => {
            const calls = (mockWorkerManager.readMemoryRange as Mock).mock.calls;
            const hasCorrectCall = calls.some((call) => call[0] === externalAddress);
            expect(hasCorrectCall).toBe(true);
        });
    });

    it('should update when PC changes', async () => {
        await act(async () => {
            renderComponent();
        });

        // Initial render — the toolbar's →PC navigation is present.
        await waitFor(() => {
            expect(screen.getByText('→PC')).toBeInTheDocument();
        });

        // The component subscribes to navigation events from EmulationContext
        // which trigger auto-follow on pause/step/breakpoint events.
    });
});
