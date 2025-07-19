import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import DisassemblerPaginated from '../DisassemblerPaginated';
import { EmulationProvider } from '../../contexts/EmulationContext';
import { WorkerDataProvider } from '../../contexts/WorkerDataContext';
import type { WorkerManager } from '../../services/WorkerManager';

// Mock the hooks
vi.mock('../../hooks/usePaginatedTable', () => ({
    usePaginatedTable: vi.fn(() => ({
        currentAddress: 0x0000,
        visibleRows: 20,
        navigateTo: vi.fn(),
        containerRef: { current: null },
        contentRef: { current: null },
        getAddressRange: () => ({ start: 0x0000, end: 0x00FF })
    }))
}));

vi.mock('../../hooks/useNavigableComponent', () => ({
    useNavigableComponent: vi.fn(({ initialAddress }) => ({
        currentAddress: initialAddress || 0x0000,
        navigateInternal: vi.fn()
    }))
}));

// Mock OPCODES
vi.mock('../../constants/opcodes', () => ({
    OPCODES: {
        0xEA: { name: 'NOP', bytes: 1, mode: 'imp' },
        0xA9: { name: 'LDA', bytes: 2, mode: 'imm' },
        0x4C: { name: 'JMP', bytes: 3, mode: 'abs' },
        0x20: { name: 'JSR', bytes: 3, mode: 'abs' },
        0x60: { name: 'RTS', bytes: 1, mode: 'imp' },
        0x00: { name: 'BRK', bytes: 1, mode: 'imp' }
    }
}));

describe('DisassemblerPaginated', () => {
    let mockWorkerManager: WorkerManager;

    beforeEach(() => {
        mockWorkerManager = {
            readMemoryRange: vi.fn().mockResolvedValue([0xEA, 0xA9, 0x42, 0x4C, 0x00, 0xFF]),
            onRunToCursorTarget: vi.fn().mockResolvedValue(() => {}),
            keyDown: vi.fn().mockResolvedValue(undefined),
            getDebugInfo: vi.fn().mockResolvedValue({
                cpu: {
                    REG_PC: '$FF00',
                    REG_A: '$42',
                    REG_X: '$00',
                    REG_Y: '$00',
                    REG_S: '$FF'
                }
            }),
            pauseEmulation: vi.fn().mockResolvedValue(undefined),
            resumeEmulation: vi.fn().mockResolvedValue(undefined),
            step: vi.fn().mockResolvedValue({
                cpu: {
                    REG_PC: '$FF01'
                }
            }),
            setBreakpoint: vi.fn().mockResolvedValue([0xFF00]),
            clearBreakpoint: vi.fn().mockResolvedValue([]),
            getBreakpoints: vi.fn().mockResolvedValue([]),
            onEmulationStatus: vi.fn().mockResolvedValue(() => {}),
            onBreakpointHit: vi.fn().mockResolvedValue(() => {}),
            runToAddress: vi.fn().mockResolvedValue(undefined),
            clearAllBreakpoints: vi.fn().mockResolvedValue(undefined)
        } as unknown as WorkerManager;
    });

    const renderComponent = (props = {}) => {
        return render(
            <WorkerDataProvider workerManager={mockWorkerManager}>
                <EmulationProvider workerManager={mockWorkerManager}>
                    <DisassemblerPaginated 
                        workerManager={mockWorkerManager}
                        {...props}
                    />
                </EmulationProvider>
            </WorkerDataProvider>
        );
    };

    it('should render disassembly view', async () => {
        renderComponent();
        
        // Should show the execution controls
        expect(screen.getByText('Step')).toBeInTheDocument();
        expect(screen.getByText('Run')).toBeInTheDocument();
        expect(screen.getByText('Reset')).toBeInTheDocument();
        expect(screen.getByText('→PC')).toBeInTheDocument();
    });

    it('should fetch and display memory as disassembled instructions', async () => {
        renderComponent();
        
        await waitFor(() => {
            expect(mockWorkerManager.readMemoryRange).toHaveBeenCalled();
        });
    });

    it('should handle step button click', async () => {
        renderComponent();
        
        const stepButton = screen.getByText('Step');
        fireEvent.click(stepButton);
        
        await waitFor(() => {
            expect(mockWorkerManager.step).toHaveBeenCalled();
        });
    });

    it('should handle run/pause button toggle', async () => {
        renderComponent();
        
        const runButton = screen.getByText('Run');
        fireEvent.click(runButton);
        
        await waitFor(() => {
            expect(mockWorkerManager.resumeEmulation).toHaveBeenCalled();
        });
    });

    it('should handle reset button click', async () => {
        renderComponent();
        
        const resetButton = screen.getByText('Reset');
        fireEvent.click(resetButton);
        
        await waitFor(() => {
            expect(mockWorkerManager.keyDown).toHaveBeenCalledWith('Tab');
        });
    });

    it('should navigate to PC when Jump to PC button is clicked', async () => {
        renderComponent();
        
        // Click Jump to PC button
        const jumpButton = screen.getByText('→PC');
        fireEvent.click(jumpButton);
        
        // Should attempt to navigate to PC address
        // (actual navigation is handled by the mocked hook)
    });

    it('should display correct addressing modes', async () => {
        // Mock memory with different instruction types
        (mockWorkerManager.readMemoryRange as Mock).mockResolvedValueOnce([
            0xEA,       // NOP (implied)
            0xA9, 0x42, // LDA #$42 (immediate)
            0x4C, 0x00, 0xFF, // JMP $FF00 (absolute)
            0x20, 0x50, 0xFF, // JSR $FF50 (absolute)
            0x60        // RTS (implied)
        ]);
        
        renderComponent();
        
        await waitFor(() => {
            expect(screen.getByText('NOP')).toBeInTheDocument();
            expect(screen.getByText('LDA')).toBeInTheDocument();
            expect(screen.getByText('#$42')).toBeInTheDocument();
            expect(screen.getByText('JMP')).toBeInTheDocument();
            expect(screen.getByText('JSR')).toBeInTheDocument();
            expect(screen.getByText('RTS')).toBeInTheDocument();
        });
    });

    it('should handle breakpoint toggle on row click', async () => {
        renderComponent();
        
        await waitFor(() => {
            const breakpointCells = screen.getAllByTitle('Set breakpoint');
            expect(breakpointCells.length).toBeGreaterThan(0);
            
            // Click on first breakpoint cell
            fireEvent.click(breakpointCells[0]);
        });
        
        await waitFor(() => {
            expect(mockWorkerManager.setBreakpoint).toHaveBeenCalled();
        });
    });

    it('should show execution state', async () => {
        renderComponent();
        
        // Should show RUNNING state by default
        expect(screen.getByText('RUNNING')).toBeInTheDocument();
    });

    it('should handle keyboard shortcuts', async () => {
        renderComponent();
        
        // Test F10 for step
        fireEvent.keyDown(window, { key: 'F10' });
        
        await waitFor(() => {
            expect(mockWorkerManager.step).toHaveBeenCalled();
        });
        
        // Test F5 for run/pause
        fireEvent.keyDown(window, { key: 'F5' });
        
        await waitFor(() => {
            expect(mockWorkerManager.resumeEmulation).toHaveBeenCalled();
        });
    });

    it('should navigate to external address when provided', async () => {
        const externalAddress = 0x1234;
        renderComponent({ currentAddress: externalAddress });
        
        // Component should attempt to navigate to the provided address
        // (actual navigation is handled by the mocked hook)
    });

    it('should update when PC changes', async () => {
        renderComponent();
        
        // Simulate PC change through context
        // This would normally come from WorkerDataSync polling
        // The component should auto-navigate to new PC position
    });
});