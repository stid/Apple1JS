import React from 'react';
import { describe, expect, beforeEach, vi } from 'vitest';
import { createMockWorkerManager } from '../../test-support/mocks/WorkerManager.mock';
import { render, screen, fireEvent } from '@testing-library/react';
import DebuggerLayout from '../DebuggerLayout';
import { IInspectableComponent } from '../../core/types/components';
import { DebuggerNavigationProvider } from '../../contexts/DebuggerNavigationContext';
import { WorkerDataProvider } from '../../contexts/WorkerDataContext';
import type { WorkerManager } from '../../services/WorkerManager';

// Mock the child components
vi.mock('../DisassemblerPaginated', () => ({
    __esModule: true,
    default: ({ currentAddress, onAddressChange }: { currentAddress?: number; onAddressChange?: (addr: number) => void }) => (
        <div data-testid="disassembler">
            <span data-testid="disassembler-address">{currentAddress}</span>
            <button onClick={() => onAddressChange?.(0x1234)}>Change Address</button>
        </div>
    ),
}));

vi.mock('../MemoryViewerPaginated', () => ({
    __esModule: true,
    default: ({ currentAddress, onAddressChange }: { currentAddress?: number; onAddressChange?: (addr: number) => void }) => (
        <div data-testid="memory-viewer">
            <span data-testid="memory-address">{currentAddress}</span>
            <button onClick={() => onAddressChange?.(0x5678)}>Change Address</button>
        </div>
    ),
}));

vi.mock('../StackViewer', () => ({
    __esModule: true,
    default: () => <div data-testid="stack-viewer">Stack Viewer</div>,
}));

vi.mock('../ExecutionControls', () => ({
    __esModule: true,
    default: () => <div data-testid="execution-controls">Execution Controls</div>,
}));

describe('DebuggerLayout', () => {
    let mockWorkerManager: WorkerManager;
    const mockRoot = {} as IInspectableComponent;

    let memoryViewAddress: number;
    let disassemblerAddress: number;
    const setMemoryViewAddress = vi.fn((addr: number) => { memoryViewAddress = addr; });
    const setDisassemblerAddress = vi.fn((addr: number) => { disassemblerAddress = addr; });

    beforeEach(() => {
        mockWorkerManager = createMockWorkerManager();
        vi.clearAllMocks();
        memoryViewAddress = 0x0000;
        disassemblerAddress = 0x0000;
    });
    
    const renderWithProviders = (component: React.ReactNode) => {
        return render(
            <WorkerDataProvider workerManager={mockWorkerManager}>
                <DebuggerNavigationProvider>
                    {component}
                </DebuggerNavigationProvider>
            </WorkerDataProvider>
        );
    };

    it('renders overview by default', () => {
        renderWithProviders(
            <DebuggerLayout 
                root={mockRoot} 
                workerManager={mockWorkerManager}
                memoryViewAddress={memoryViewAddress}
                setMemoryViewAddress={setMemoryViewAddress}
                disassemblerAddress={disassemblerAddress}
                setDisassemblerAddress={setDisassemblerAddress}
            />
        );
        
        expect(screen.getByText('Overview')).toBeInTheDocument();
        expect(screen.getByTestId('execution-controls')).toBeInTheDocument();
        expect(screen.getByTestId('stack-viewer')).toBeInTheDocument();
    });

    it('switches between tabs', () => {
        renderWithProviders(
            <DebuggerLayout 
                    root={mockRoot} 
                    workerManager={mockWorkerManager}
                    memoryViewAddress={memoryViewAddress}
                    setMemoryViewAddress={setMemoryViewAddress}
                    disassemblerAddress={disassemblerAddress}
                    setDisassemblerAddress={setDisassemblerAddress}
            />
        );
        
        // Click Memory tab
        fireEvent.click(screen.getByText('Memory'));
        expect(screen.getByTestId('memory-viewer')).toBeInTheDocument();
        expect(screen.queryByTestId('execution-controls')).not.toBeInTheDocument();
        
        // Click Disassembly tab
        fireEvent.click(screen.getByText('Disassembly'));
        expect(screen.getByTestId('disassembler')).toBeInTheDocument();
        expect(screen.queryByTestId('memory-viewer')).not.toBeInTheDocument();
    });

    it('maintains memory viewer address state when switching tabs', () => {
        const { rerender } = renderWithProviders(
                <DebuggerLayout 
                    root={mockRoot} 
                    workerManager={mockWorkerManager}
                    memoryViewAddress={memoryViewAddress}
                    setMemoryViewAddress={setMemoryViewAddress}
                    disassemblerAddress={disassemblerAddress}
                    setDisassemblerAddress={setDisassemblerAddress}
                />
        );
        
        // Switch to Memory tab
        fireEvent.click(screen.getByText('Memory'));
        
        // Initial address should be 0
        expect(screen.getByTestId('memory-address')).toHaveTextContent('0');
        
        // Change address
        fireEvent.click(screen.getByText('Change Address'));
        
        // Verify the callback was called
        expect(setMemoryViewAddress).toHaveBeenCalledWith(0x5678);
        
        // Simulate parent component updating the state
        memoryViewAddress = 0x5678;
        
        // Re-render with new props
        rerender(
            <WorkerDataProvider workerManager={mockWorkerManager}>
                <DebuggerNavigationProvider>
                    <DebuggerLayout 
                        root={mockRoot} 
                        workerManager={mockWorkerManager}
                        memoryViewAddress={memoryViewAddress}
                        setMemoryViewAddress={setMemoryViewAddress}
                        disassemblerAddress={disassemblerAddress}
                        setDisassemblerAddress={setDisassemblerAddress}
                    />
                </DebuggerNavigationProvider>
            </WorkerDataProvider>
        );
        
        expect(screen.getByTestId('memory-address')).toHaveTextContent('22136'); // 0x5678
        
        // Switch to Overview and back
        fireEvent.click(screen.getByText('Overview'));
        fireEvent.click(screen.getByText('Memory'));
        
        // Address should be preserved
        expect(screen.getByTestId('memory-address')).toHaveTextContent('22136');
    });

    it('maintains disassembler address state when switching tabs', () => {
        const { rerender } = renderWithProviders(
                <DebuggerLayout 
                    root={mockRoot} 
                    workerManager={mockWorkerManager}
                    memoryViewAddress={memoryViewAddress}
                    setMemoryViewAddress={setMemoryViewAddress}
                    disassemblerAddress={disassemblerAddress}
                    setDisassemblerAddress={setDisassemblerAddress}
                />
        );
        
        // Switch to Disassembly tab
        fireEvent.click(screen.getByText('Disassembly'));
        
        // Initial address should be 0
        expect(screen.getByTestId('disassembler-address')).toHaveTextContent('0');
        
        // Change address
        fireEvent.click(screen.getByText('Change Address'));
        
        // Verify the callback was called
        expect(setDisassemblerAddress).toHaveBeenCalledWith(0x1234);
        
        // Simulate parent component updating the state
        disassemblerAddress = 0x1234;
        
        // Re-render with new props
        rerender(
            <WorkerDataProvider workerManager={mockWorkerManager}>
                <DebuggerNavigationProvider>
                    <DebuggerLayout 
                        root={mockRoot} 
                        workerManager={mockWorkerManager}
                        memoryViewAddress={memoryViewAddress}
                        setMemoryViewAddress={setMemoryViewAddress}
                        disassemblerAddress={disassemblerAddress}
                        setDisassemblerAddress={setDisassemblerAddress}
                    />
                </DebuggerNavigationProvider>
            </WorkerDataProvider>
        );
        
        expect(screen.getByTestId('disassembler-address')).toHaveTextContent('4660'); // 0x1234
        
        // Switch to Overview and back
        fireEvent.click(screen.getByText('Overview'));
        fireEvent.click(screen.getByText('Disassembly'));
        
        // Address should be preserved
        expect(screen.getByTestId('disassembler-address')).toHaveTextContent('4660');
    });

    it('maintains separate address states for memory and disassembler', () => {
        const { rerender } = renderWithProviders(
                <DebuggerLayout 
                    root={mockRoot} 
                    workerManager={mockWorkerManager}
                    memoryViewAddress={memoryViewAddress}
                    setMemoryViewAddress={setMemoryViewAddress}
                    disassemblerAddress={disassemblerAddress}
                    setDisassemblerAddress={setDisassemblerAddress}
                />
        );
        
        // Set memory address
        fireEvent.click(screen.getByText('Memory'));
        fireEvent.click(screen.getByText('Change Address'));
        
        // Verify memory callback was called
        expect(setMemoryViewAddress).toHaveBeenCalledWith(0x5678);
        memoryViewAddress = 0x5678;
        
        // Set disassembler address
        fireEvent.click(screen.getByText('Disassembly'));
        fireEvent.click(screen.getByText('Change Address'));
        
        // Verify disassembler callback was called
        expect(setDisassemblerAddress).toHaveBeenCalledWith(0x1234);
        disassemblerAddress = 0x1234;
        
        // Re-render with both updated addresses
        rerender(
            <WorkerDataProvider workerManager={mockWorkerManager}>
                <DebuggerNavigationProvider>
                    <DebuggerLayout 
                        root={mockRoot} 
                        workerManager={mockWorkerManager}
                        memoryViewAddress={memoryViewAddress}
                        setMemoryViewAddress={setMemoryViewAddress}
                        disassemblerAddress={disassemblerAddress}
                        setDisassemblerAddress={setDisassemblerAddress}
                    />
                </DebuggerNavigationProvider>
            </WorkerDataProvider>
        );
        
        // Check both maintain their own state
        fireEvent.click(screen.getByText('Memory'));
        expect(screen.getByTestId('memory-address')).toHaveTextContent('22136'); // 0x5678
        
        fireEvent.click(screen.getByText('Disassembly'));
        expect(screen.getByTestId('disassembler-address')).toHaveTextContent('4660'); // 0x1234
    });
});