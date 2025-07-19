import { describe, expect, beforeEach, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import AddressLink from '../AddressLink';
import { createMockWorkerManager } from '../../test-support/mocks/WorkerManager.mock';
import type { WorkerManager } from '../../services/WorkerManager';

// Mock navigation hook
const mockNavigate = vi.fn();
vi.mock('../../contexts/DebuggerNavigationContext', () => ({
    useDebuggerNavigation: () => ({
        navigate: mockNavigate
    })
}));

describe('AddressLink component', () => {
    let mockWorkerManager: WorkerManager;
    
    beforeEach(() => {
        mockWorkerManager = createMockWorkerManager();
        mockNavigate.mockClear();
    });
    
    afterEach(() => {
        vi.clearAllMocks();
        // Clean up any context menus
        document.querySelectorAll('.absolute.bg-surface-primary').forEach(el => el.remove());
    });
    
    describe('formatting', () => {
        it('should format address as hex4 by default', () => {
            render(<AddressLink address={0x1000} />);
            expect(screen.getByRole('button')).toHaveTextContent('$1000');
        });
        
        it('should format address as hex2', () => {
            render(<AddressLink address={0x42} format="hex2" />);
            expect(screen.getByRole('button')).toHaveTextContent('$42');
        });
        
        it('should format address as raw', () => {
            render(<AddressLink address={1234} format="raw" />);
            expect(screen.getByRole('button')).toHaveTextContent('1234');
        });
        
        it('should use custom prefix', () => {
            render(<AddressLink address={0x1000} prefix="0x" />);
            expect(screen.getByRole('button')).toHaveTextContent('0x1000');
        });
        
        it('should render children instead of formatted address', () => {
            render(<AddressLink address={0x1000}>Custom Text</AddressLink>);
            expect(screen.getByRole('button')).toHaveTextContent('Custom Text');
        });
        
        it('should apply custom className', () => {
            render(<AddressLink address={0x1000} className="test-class" />);
            expect(screen.getByRole('button')).toHaveClass('test-class');
        });
    });
    
    describe('navigation', () => {
        it('should navigate to disassembly on Ctrl+Click', () => {
            render(<AddressLink address={0x2000} showContextMenu={true} />);
            
            fireEvent.click(screen.getByRole('button'), { ctrlKey: true });
            
            expect(mockNavigate).toHaveBeenCalledWith(0x2000, 'disassembly');
        });
        
        it('should navigate to disassembly on Cmd+Click (Mac)', () => {
            render(<AddressLink address={0x3000} showContextMenu={true} />);
            
            fireEvent.click(screen.getByRole('button'), { metaKey: true });
            
            expect(mockNavigate).toHaveBeenCalledWith(0x3000, 'disassembly');
        });
        
        it('should show correct title when context menu enabled', () => {
            render(<AddressLink address={0x1000} showContextMenu={true} />);
            
            expect(screen.getByRole('button')).toHaveAttribute(
                'title',
                'Click for menu • Ctrl/Cmd+Click to navigate'
            );
        });
        
        it('should show correct title when context menu disabled', () => {
            render(<AddressLink address={0x1000} showContextMenu={false} />);
            
            expect(screen.getByRole('button')).toHaveAttribute(
                'title',
                'Ctrl/Cmd+Click to navigate'
            );
        });
    });
    
    describe('context menu', () => {
        it('should show context menu on normal click when enabled', async () => {
            render(<AddressLink address={0x4000} showContextMenu={true} />);
            
            fireEvent.click(screen.getByRole('button'));
            
            await waitFor(() => {
                expect(screen.getByText(/View in Disassembly/)).toBeInTheDocument();
                expect(screen.getByText(/View in Memory Editor/)).toBeInTheDocument();
            });
        });
        
        it('should not show context menu when disabled', () => {
            render(<AddressLink address={0x5000} showContextMenu={false} />);
            
            fireEvent.click(screen.getByRole('button'));
            
            expect(screen.queryByText(/View in Disassembly/)).not.toBeInTheDocument();
        });
        
        it('should show context menu on right click', async () => {
            render(<AddressLink address={0x6000} showContextMenu={true} />);
            
            fireEvent.contextMenu(screen.getByRole('button'));
            
            await waitFor(() => {
                expect(screen.getByText(/View in Disassembly/)).toBeInTheDocument();
            });
        });
        
        it('should navigate to disassembly from context menu', async () => {
            render(<AddressLink address={0x7000} showContextMenu={true} />);
            
            fireEvent.click(screen.getByRole('button'));
            
            await waitFor(() => {
                const disassemblyOption = screen.getByText(/View in Disassembly/);
                fireEvent.click(disassemblyOption);
            });
            
            expect(mockNavigate).toHaveBeenCalledWith(0x7000, 'disassembly');
        });
        
        it('should navigate to memory from context menu', async () => {
            render(<AddressLink address={0x8000} showContextMenu={true} />);
            
            fireEvent.click(screen.getByRole('button'));
            
            await waitFor(() => {
                const memoryOption = screen.getByText(/View in Memory Editor/);
                fireEvent.click(memoryOption);
            });
            
            expect(mockNavigate).toHaveBeenCalledWith(0x8000, 'memory');
        });
        
        it('should show run-to-cursor option when enabled', async () => {
            render(
                <AddressLink 
                    address={0x9000} 
                    showContextMenu={true} 
                    workerManager={mockWorkerManager}
                    showRunToCursor={true}
                />
            );
            
            fireEvent.click(screen.getByRole('button'));
            
            await waitFor(() => {
                expect(screen.getByText(/Run to Cursor/)).toBeInTheDocument();
            });
        });
        
        it('should send RUN_TO_ADDRESS message when run-to-cursor clicked', async () => {
            render(
                <AddressLink 
                    address={0xA000} 
                    showContextMenu={true} 
                    workerManager={mockWorkerManager}
                    showRunToCursor={true}
                />
            );
            
            fireEvent.click(screen.getByRole('button'));
            
            await waitFor(() => {
                const runOption = screen.getByText(/Run to Cursor/);
                fireEvent.click(runOption);
            });
            
            expect(mockWorkerManager.runToAddress).toHaveBeenCalledWith(0xA000);
        });
        
        it('should close context menu when clicking outside', async () => {
            render(
                <div>
                    <AddressLink address={0xB000} showContextMenu={true} />
                    <div data-testid="outside">Outside element</div>
                </div>
            );
            
            fireEvent.click(screen.getByRole('button'));
            
            await waitFor(() => {
                expect(screen.getByText(/View in Disassembly/)).toBeInTheDocument();
            });
            
            // Click outside after a timeout
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
                fireEvent.click(screen.getByTestId('outside'));
            });
            
            await waitFor(() => {
                expect(screen.queryByText(/View in Disassembly/)).not.toBeInTheDocument();
            });
        });
    });
    
    describe('event handling', () => {
        it('should prevent default on right click', () => {
            render(<AddressLink address={0xC000} showContextMenu={true} />);
            
            const event = new MouseEvent('mousedown', { 
                button: 2,
                bubbles: true,
                cancelable: true 
            });
            const preventDefault = vi.fn();
            const stopPropagation = vi.fn();
            event.preventDefault = preventDefault;
            event.stopPropagation = stopPropagation;
            
            screen.getByRole('button').dispatchEvent(event);
            
            expect(preventDefault).toHaveBeenCalled();
            expect(stopPropagation).toHaveBeenCalled();
        });
        
        it('should prevent default on context menu', () => {
            render(<AddressLink address={0xD000} showContextMenu={true} />);
            
            const event = new MouseEvent('contextmenu', {
                bubbles: true,
                cancelable: true
            });
            const preventDefault = vi.fn();
            const stopPropagation = vi.fn();
            event.preventDefault = preventDefault;
            event.stopPropagation = stopPropagation;
            
            screen.getByRole('button').dispatchEvent(event);
            
            expect(preventDefault).toHaveBeenCalled();
            expect(stopPropagation).toHaveBeenCalled();
        });
        
        it('should have correct styles', () => {
            render(<AddressLink address={0xE000} />);
            
            const button = screen.getByRole('button');
            expect(button).toHaveStyle({
                display: 'inline',
                textAlign: 'inherit',
                textDecoration: 'inherit',
                lineHeight: 'inherit'
            });
        });
    });
    
    describe('edge cases', () => {
        it('should handle format fallback for invalid format', () => {
            render(<AddressLink address={0xF000} format={'invalid' as 'hex4'} />);
            expect(screen.getByRole('button')).toHaveTextContent('$F000');
        });
        
        it('should pad hex values correctly', () => {
            const { rerender } = render(<AddressLink address={0x1} format="hex4" />);
            expect(screen.getByRole('button')).toHaveTextContent('$0001');
            
            rerender(<AddressLink address={0x1} format="hex2" />);
            expect(screen.getByRole('button')).toHaveTextContent('$01');
        });
        
        it('should not show run-to-cursor without worker', async () => {
            render(
                <AddressLink 
                    address={0x1234} 
                    showContextMenu={true} 
                    showRunToCursor={true}
                />
            );
            
            fireEvent.click(screen.getByRole('button'));
            
            await waitFor(() => {
                expect(screen.getByText(/View in Disassembly/)).toBeInTheDocument();
                expect(screen.queryByText(/Run to Cursor/)).not.toBeInTheDocument();
            });
        });
    });
});