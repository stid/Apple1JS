import { render, screen, fireEvent } from '@testing-library/react';
import DebuggerLayout from '../DebuggerLayout';
import { IInspectableComponent } from '../../core/types/components';
import { DebuggerNavigationProvider } from '../../contexts/DebuggerNavigationContext';

// Mock the child components
jest.mock('../DisassemblerPaginated', () => ({
    __esModule: true,
    default: ({ currentAddress, onAddressChange }: { currentAddress?: number; onAddressChange?: (addr: number) => void }) => (
        <div data-testid="disassembler">
            <span data-testid="disassembler-address">{currentAddress}</span>
            <button onClick={() => onAddressChange?.(0x1234)}>Change Address</button>
        </div>
    ),
}));

jest.mock('../MemoryViewerPaginated', () => ({
    __esModule: true,
    default: ({ currentAddress, onAddressChange }: { currentAddress?: number; onAddressChange?: (addr: number) => void }) => (
        <div data-testid="memory-viewer">
            <span data-testid="memory-address">{currentAddress}</span>
            <button onClick={() => onAddressChange?.(0x5678)}>Change Address</button>
        </div>
    ),
}));

jest.mock('../StackViewer', () => ({
    __esModule: true,
    default: () => <div data-testid="stack-viewer">Stack Viewer</div>,
}));

jest.mock('../ExecutionControls', () => ({
    __esModule: true,
    default: () => <div data-testid="execution-controls">Execution Controls</div>,
}));

describe('DebuggerLayout', () => {
    const mockWorker = {
        postMessage: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
    } as unknown as Worker;

    const mockRoot = {} as IInspectableComponent;

    let memoryViewAddress: number;
    let disassemblerAddress: number;
    const setMemoryViewAddress = jest.fn((addr: number) => { memoryViewAddress = addr; });
    const setDisassemblerAddress = jest.fn((addr: number) => { disassemblerAddress = addr; });

    beforeEach(() => {
        jest.clearAllMocks();
        memoryViewAddress = 0x0000;
        disassemblerAddress = 0x0000;
    });

    it('renders overview by default', () => {
        render(
            <DebuggerNavigationProvider>
                <DebuggerLayout 
                    root={mockRoot} 
                    worker={mockWorker}
                    memoryViewAddress={memoryViewAddress}
                    setMemoryViewAddress={setMemoryViewAddress}
                    disassemblerAddress={disassemblerAddress}
                    setDisassemblerAddress={setDisassemblerAddress}
                />
            </DebuggerNavigationProvider>
        );
        
        expect(screen.getByText('Overview')).toBeInTheDocument();
        expect(screen.getByTestId('execution-controls')).toBeInTheDocument();
        expect(screen.getByTestId('stack-viewer')).toBeInTheDocument();
    });

    it('switches between tabs', () => {
        render(
            <DebuggerNavigationProvider>
                <DebuggerLayout 
                    root={mockRoot} 
                    worker={mockWorker}
                    memoryViewAddress={memoryViewAddress}
                    setMemoryViewAddress={setMemoryViewAddress}
                    disassemblerAddress={disassemblerAddress}
                    setDisassemblerAddress={setDisassemblerAddress}
                />
            </DebuggerNavigationProvider>
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
        const { rerender } = render(
            <DebuggerNavigationProvider>
                <DebuggerLayout 
                    root={mockRoot} 
                    worker={mockWorker}
                    memoryViewAddress={memoryViewAddress}
                    setMemoryViewAddress={setMemoryViewAddress}
                    disassemblerAddress={disassemblerAddress}
                    setDisassemblerAddress={setDisassemblerAddress}
                />
            </DebuggerNavigationProvider>
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
            <DebuggerNavigationProvider>
                <DebuggerLayout 
                    root={mockRoot} 
                    worker={mockWorker}
                    memoryViewAddress={memoryViewAddress}
                    setMemoryViewAddress={setMemoryViewAddress}
                    disassemblerAddress={disassemblerAddress}
                    setDisassemblerAddress={setDisassemblerAddress}
                />
            </DebuggerNavigationProvider>
        );
        
        expect(screen.getByTestId('memory-address')).toHaveTextContent('22136'); // 0x5678
        
        // Switch to Overview and back
        fireEvent.click(screen.getByText('Overview'));
        fireEvent.click(screen.getByText('Memory'));
        
        // Address should be preserved
        expect(screen.getByTestId('memory-address')).toHaveTextContent('22136');
    });

    it('maintains disassembler address state when switching tabs', () => {
        const { rerender } = render(
            <DebuggerNavigationProvider>
                <DebuggerLayout 
                    root={mockRoot} 
                    worker={mockWorker}
                    memoryViewAddress={memoryViewAddress}
                    setMemoryViewAddress={setMemoryViewAddress}
                    disassemblerAddress={disassemblerAddress}
                    setDisassemblerAddress={setDisassemblerAddress}
                />
            </DebuggerNavigationProvider>
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
            <DebuggerNavigationProvider>
                <DebuggerLayout 
                    root={mockRoot} 
                    worker={mockWorker}
                    memoryViewAddress={memoryViewAddress}
                    setMemoryViewAddress={setMemoryViewAddress}
                    disassemblerAddress={disassemblerAddress}
                    setDisassemblerAddress={setDisassemblerAddress}
                />
            </DebuggerNavigationProvider>
        );
        
        expect(screen.getByTestId('disassembler-address')).toHaveTextContent('4660'); // 0x1234
        
        // Switch to Overview and back
        fireEvent.click(screen.getByText('Overview'));
        fireEvent.click(screen.getByText('Disassembly'));
        
        // Address should be preserved
        expect(screen.getByTestId('disassembler-address')).toHaveTextContent('4660');
    });

    it('maintains separate address states for memory and disassembler', () => {
        const { rerender } = render(
            <DebuggerNavigationProvider>
                <DebuggerLayout 
                    root={mockRoot} 
                    worker={mockWorker}
                    memoryViewAddress={memoryViewAddress}
                    setMemoryViewAddress={setMemoryViewAddress}
                    disassemblerAddress={disassemblerAddress}
                    setDisassemblerAddress={setDisassemblerAddress}
                />
            </DebuggerNavigationProvider>
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
            <DebuggerNavigationProvider>
                <DebuggerLayout 
                    root={mockRoot} 
                    worker={mockWorker}
                    memoryViewAddress={memoryViewAddress}
                    setMemoryViewAddress={setMemoryViewAddress}
                    disassemblerAddress={disassemblerAddress}
                    setDisassemblerAddress={setDisassemblerAddress}
                />
            </DebuggerNavigationProvider>
        );
        
        // Check both maintain their own state
        fireEvent.click(screen.getByText('Memory'));
        expect(screen.getByTestId('memory-address')).toHaveTextContent('22136'); // 0x5678
        
        fireEvent.click(screen.getByText('Disassembly'));
        expect(screen.getByTestId('disassembler-address')).toHaveTextContent('4660'); // 0x1234
    });
});