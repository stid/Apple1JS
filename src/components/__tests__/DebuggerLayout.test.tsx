import { render, screen, fireEvent } from '@testing-library/react';
import DebuggerLayout from '../DebuggerLayout';
import { IInspectableComponent } from '../../core/@types/IInspectableComponent';

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

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders overview by default', () => {
        render(<DebuggerLayout root={mockRoot} worker={mockWorker} />);
        
        expect(screen.getByText('Overview')).toBeInTheDocument();
        expect(screen.getByTestId('execution-controls')).toBeInTheDocument();
        expect(screen.getByTestId('stack-viewer')).toBeInTheDocument();
    });

    it('switches between tabs', () => {
        render(<DebuggerLayout root={mockRoot} worker={mockWorker} />);
        
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
        render(<DebuggerLayout root={mockRoot} worker={mockWorker} />);
        
        // Switch to Memory tab
        fireEvent.click(screen.getByText('Memory'));
        
        // Initial address should be 0
        expect(screen.getByTestId('memory-address')).toHaveTextContent('0');
        
        // Change address
        fireEvent.click(screen.getByText('Change Address'));
        expect(screen.getByTestId('memory-address')).toHaveTextContent('22136'); // 0x5678
        
        // Switch to Overview and back
        fireEvent.click(screen.getByText('Overview'));
        fireEvent.click(screen.getByText('Memory'));
        
        // Address should be preserved
        expect(screen.getByTestId('memory-address')).toHaveTextContent('22136');
    });

    it('maintains disassembler address state when switching tabs', () => {
        render(<DebuggerLayout root={mockRoot} worker={mockWorker} />);
        
        // Switch to Disassembly tab
        fireEvent.click(screen.getByText('Disassembly'));
        
        // Initial address should be 0
        expect(screen.getByTestId('disassembler-address')).toHaveTextContent('0');
        
        // Change address
        fireEvent.click(screen.getByText('Change Address'));
        expect(screen.getByTestId('disassembler-address')).toHaveTextContent('4660'); // 0x1234
        
        // Switch to Overview and back
        fireEvent.click(screen.getByText('Overview'));
        fireEvent.click(screen.getByText('Disassembly'));
        
        // Address should be preserved
        expect(screen.getByTestId('disassembler-address')).toHaveTextContent('4660');
    });

    it('maintains separate address states for memory and disassembler', () => {
        render(<DebuggerLayout root={mockRoot} worker={mockWorker} />);
        
        // Set memory address
        fireEvent.click(screen.getByText('Memory'));
        fireEvent.click(screen.getByText('Change Address'));
        
        // Set disassembler address
        fireEvent.click(screen.getByText('Disassembly'));
        fireEvent.click(screen.getByText('Change Address'));
        
        // Check both maintain their own state
        fireEvent.click(screen.getByText('Memory'));
        expect(screen.getByTestId('memory-address')).toHaveTextContent('22136'); // 0x5678
        
        fireEvent.click(screen.getByText('Disassembly'));
        expect(screen.getByTestId('disassembler-address')).toHaveTextContent('4660'); // 0x1234
    });
});