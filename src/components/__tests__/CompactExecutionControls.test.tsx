import '@testing-library/jest-dom/jest-globals';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import CompactExecutionControls from '../CompactExecutionControls';
import { WORKER_MESSAGES } from '../../apple1/TSTypes';

describe('CompactExecutionControls component', () => {
    let mockWorker: {
        postMessage: jest.Mock;
        addEventListener: jest.Mock;
        removeEventListener: jest.Mock;
    };
    let mockOnAddressChange: jest.Mock;
    let mockOnAddressSubmit: jest.Mock;
    let messageHandlers: { [key: string]: ((e: MessageEvent) => void)[] };
    
    beforeEach(() => {
        messageHandlers = {};
        mockWorker = {
            postMessage: jest.fn(),
            addEventListener: jest.fn((event, handler) => {
                if (!messageHandlers[event]) {
                    messageHandlers[event] = [];
                }
                messageHandlers[event].push(handler);
            }),
            removeEventListener: jest.fn()
        };
        mockOnAddressChange = jest.fn();
        mockOnAddressSubmit = jest.fn();
        
        // Reset window event listeners
        jest.clearAllMocks();
    });
    
    afterEach(() => {
        jest.clearAllMocks();
    });
    
    const renderComponent = (props = {}) => {
        const defaultProps = {
            worker: mockWorker as unknown as Worker,
            address: '1000',
            onAddressChange: mockOnAddressChange,
            onAddressSubmit: mockOnAddressSubmit,
            ...props
        };
        return render(<CompactExecutionControls {...defaultProps} />);
    };
    
    describe('rendering', () => {
        it('should render all controls', () => {
            renderComponent();
            
            expect(screen.getByText('Addr:')).toBeInTheDocument();
            expect(screen.getByRole('textbox')).toHaveValue('1000');
            expect(screen.getByRole('button', { name: /Step/ })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Pause/ })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Reset/ })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /→PC/ })).toBeInTheDocument();
            expect(screen.getByText('Status:')).toBeInTheDocument();
            expect(screen.getByText('RUNNING')).toBeInTheDocument();
        });
        
        it('should query emulation status on mount', () => {
            renderComponent();
            
            expect(mockWorker.postMessage).toHaveBeenCalledWith({
                type: WORKER_MESSAGES.GET_EMULATION_STATUS
            });
        });
    });
    
    describe('address input', () => {
        it('should handle address changes', () => {
            renderComponent();
            
            const input = screen.getByRole('textbox');
            fireEvent.change(input, { target: { value: '2000' } });
            
            expect(mockOnAddressChange).toHaveBeenCalled();
        });
        
        it('should handle address submit on Enter', () => {
            renderComponent();
            
            const input = screen.getByRole('textbox');
            fireEvent.keyDown(input, { key: 'Enter' });
            
            expect(mockOnAddressSubmit).toHaveBeenCalled();
        });
    });
    
    describe('execution controls', () => {
        it('should handle pause/resume', () => {
            renderComponent();
            
            const pauseButton = screen.getByRole('button', { name: /Pause/ });
            
            // Click pause
            fireEvent.click(pauseButton);
            
            expect(mockWorker.postMessage).toHaveBeenCalledWith({
                type: WORKER_MESSAGES.PAUSE_EMULATION
            });
            
            expect(screen.getByRole('button', { name: /Run/ })).toBeInTheDocument();
            expect(screen.getByText('PAUSED')).toBeInTheDocument();
            
            // Click run
            fireEvent.click(screen.getByRole('button', { name: /Run/ }));
            
            expect(mockWorker.postMessage).toHaveBeenCalledWith({
                type: WORKER_MESSAGES.RESUME_EMULATION
            });
        });
        
        it('should handle step when paused', async () => {
            renderComponent();
            
            // First pause
            fireEvent.click(screen.getByRole('button', { name: /Pause/ }));
            
            const stepButton = screen.getByRole('button', { name: /Step/ });
            expect(stepButton).not.toBeDisabled();
            
            fireEvent.click(stepButton);
            
            expect(mockWorker.postMessage).toHaveBeenCalledWith({
                type: WORKER_MESSAGES.STEP
            });
            
            // Should show stepping state briefly
            expect(screen.getByText('STEPPING')).toBeInTheDocument();
            
            // Wait for it to return to paused
            await waitFor(() => {
                expect(screen.getByText('PAUSED')).toBeInTheDocument();
            }, { timeout: 200 });
        });
        
        it('should disable step when running', () => {
            renderComponent();
            
            const stepButton = screen.getByRole('button', { name: /Step/ });
            expect(stepButton).toBeDisabled();
        });
        
        it('should handle reset', () => {
            renderComponent();
            
            const resetButton = screen.getByRole('button', { name: /Reset/ });
            fireEvent.click(resetButton);
            
            expect(mockWorker.postMessage).toHaveBeenCalledWith({
                data: 'Tab',
                type: WORKER_MESSAGES.KEY_DOWN
            });
        });
        
        it('should handle jump to PC', () => {
            const postMessageSpy = jest.spyOn(window, 'postMessage');
            
            renderComponent();
            
            const jumpButton = screen.getByRole('button', { name: /→PC/ });
            fireEvent.click(jumpButton);
            
            expect(postMessageSpy).toHaveBeenCalledWith(
                { type: 'JUMP_TO_PC' },
                '*'
            );
            
            postMessageSpy.mockRestore();
        });
    });
    
    describe('worker messages', () => {
        it('should update state on emulation status message', () => {
            renderComponent();
            
            // Simulate paused status from worker
            const handler = messageHandlers.message[0];
            act(() => {
                handler({
                    data: {
                        type: WORKER_MESSAGES.EMULATION_STATUS,
                        data: 'paused'
                    }
                } as MessageEvent);
            });
            
            expect(screen.getByText('PAUSED')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Run/ })).toBeInTheDocument();
            
            // Simulate running status
            act(() => {
                handler({
                    data: {
                        type: WORKER_MESSAGES.EMULATION_STATUS,
                        data: 'running'
                    }
                } as MessageEvent);
            });
            
            expect(screen.getByText('RUNNING')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Pause/ })).toBeInTheDocument();
        });
        
        it('should remove message listener on unmount', () => {
            const { unmount } = renderComponent();
            
            unmount();
            
            expect(mockWorker.removeEventListener).toHaveBeenCalledWith(
                'message',
                expect.any(Function)
            );
        });
    });
    
    describe('keyboard shortcuts', () => {
        it('should handle F10 for step when paused', () => {
            renderComponent();
            
            // First pause
            fireEvent.click(screen.getByRole('button', { name: /Pause/ }));
            
            // Clear previous calls
            mockWorker.postMessage.mockClear();
            
            // Press F10
            fireEvent.keyDown(window, { key: 'F10' });
            
            expect(mockWorker.postMessage).toHaveBeenCalledWith({
                type: WORKER_MESSAGES.STEP
            });
        });
        
        it('should handle space for step when paused and focused on body', () => {
            renderComponent();
            
            // First pause
            fireEvent.click(screen.getByRole('button', { name: /Pause/ }));
            
            // Clear previous calls
            mockWorker.postMessage.mockClear();
            
            // Press space with body as target
            const event = new KeyboardEvent('keydown', { 
                key: ' ',
                bubbles: true 
            });
            Object.defineProperty(event, 'target', { value: document.body });
            
            act(() => {
                window.dispatchEvent(event);
            });
            
            expect(mockWorker.postMessage).toHaveBeenCalledWith({
                type: WORKER_MESSAGES.STEP
            });
        });
        
        it('should not handle space for step when in input field', () => {
            renderComponent();
            
            // First pause
            fireEvent.click(screen.getByRole('button', { name: /Pause/ }));
            
            // Clear previous calls
            mockWorker.postMessage.mockClear();
            
            // Press space in input field
            const input = screen.getByRole('textbox');
            fireEvent.keyDown(input, { key: ' ' });
            
            expect(mockWorker.postMessage).not.toHaveBeenCalledWith({
                type: WORKER_MESSAGES.STEP
            });
        });
        
        it('should handle F5 for run/pause toggle', () => {
            renderComponent();
            
            // Clear initial calls
            mockWorker.postMessage.mockClear();
            
            // Press F5
            fireEvent.keyDown(window, { key: 'F5' });
            
            expect(mockWorker.postMessage).toHaveBeenCalledWith({
                type: WORKER_MESSAGES.PAUSE_EMULATION
            });
        });
        
        it('should handle F8 for jump to PC', () => {
            const postMessageSpy = jest.spyOn(window, 'postMessage');
            
            renderComponent();
            
            // Press F8
            fireEvent.keyDown(window, { key: 'F8' });
            
            expect(postMessageSpy).toHaveBeenCalledWith(
                { type: 'JUMP_TO_PC' },
                '*'
            );
            
            postMessageSpy.mockRestore();
        });
        
        it('should prevent default for shortcut keys', () => {
            renderComponent();
            
            const preventDefaultSpy = jest.fn();
            
            // Test F5
            const f5Event = new KeyboardEvent('keydown', { key: 'F5' });
            f5Event.preventDefault = preventDefaultSpy;
            window.dispatchEvent(f5Event);
            
            expect(preventDefaultSpy).toHaveBeenCalled();
            
            // Test F8
            preventDefaultSpy.mockClear();
            const f8Event = new KeyboardEvent('keydown', { key: 'F8' });
            f8Event.preventDefault = preventDefaultSpy;
            window.dispatchEvent(f8Event);
            
            expect(preventDefaultSpy).toHaveBeenCalled();
        });
    });
    
    describe('visual states', () => {
        it('should show correct styles for disabled step button', () => {
            renderComponent();
            
            const stepButton = screen.getByRole('button', { name: /Step/ });
            expect(stepButton).toHaveClass('cursor-not-allowed');
            expect(stepButton).toHaveClass('text-text-disabled');
        });
        
        it('should show correct styles for enabled step button', () => {
            renderComponent();
            
            // First pause
            fireEvent.click(screen.getByRole('button', { name: /Pause/ }));
            
            const stepButton = screen.getByRole('button', { name: /Step/ });
            expect(stepButton).not.toHaveClass('cursor-not-allowed');
            expect(stepButton).toHaveClass('text-data-value');
        });
        
        it('should show help text on larger screens', () => {
            renderComponent();
            
            expect(screen.getByText(/F10: Step/)).toBeInTheDocument();
        });
    });
});