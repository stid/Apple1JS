import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import MemoryViewer from '../MemoryViewer';
import { WORKER_MESSAGES } from '../../apple1/TSTypes';
import { LoggingProvider } from '../../contexts/LoggingContext';

interface MockAddressLinkProps {
    address: number;
    className?: string;
}

// Mock AddressLink component
jest.mock('../AddressLink', () => ({
    __esModule: true,
    default: ({ address, className }: MockAddressLinkProps) => (
        <span data-testid={`address-link-${address}`} className={className}>
            {address.toString(16).padStart(4, '0').toUpperCase()}
        </span>
    ),
}));

// Helper function to render with LoggingProvider
const renderWithProviders = (component: React.ReactElement) => {
    return render(
        <LoggingProvider>
            {component}
        </LoggingProvider>
    );
};

describe('MemoryViewer', () => {
    let mockWorker: Worker;
    let mockPostMessage: jest.Mock;
    let mockAddEventListener: jest.Mock;
    let mockRemoveEventListener: jest.Mock;
    let messageHandlers: Map<string, (event: MessageEvent) => void>;

    beforeEach(() => {
        mockPostMessage = jest.fn();
        mockAddEventListener = jest.fn((event, handler) => {
            messageHandlers.set(event, handler);
        });
        mockRemoveEventListener = jest.fn((event) => {
            messageHandlers.delete(event);
        });
        messageHandlers = new Map();

        mockWorker = {
            postMessage: mockPostMessage,
            addEventListener: mockAddEventListener,
            removeEventListener: mockRemoveEventListener,
        } as unknown as Worker;

        // Mock timers
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    it('should render the memory viewer component', () => {
        renderWithProviders(<MemoryViewer worker={mockWorker} />);
        
        expect(screen.getByText('Address:')).toBeInTheDocument();
        expect(screen.getByText('(Press Enter)')).toBeInTheDocument();
        expect(screen.getByText('ASCII')).toBeInTheDocument();
    });

    it('should request memory data on mount', () => {
        renderWithProviders(<MemoryViewer worker={mockWorker} />);
        
        expect(mockPostMessage).toHaveBeenCalledWith({
            type: WORKER_MESSAGES.GET_MEMORY_RANGE,
            data: {
                start: 0x0000,
                length: 256
            }
        });
    });

    it('should request memory data periodically', () => {
        renderWithProviders(<MemoryViewer worker={mockWorker} />);
        
        // Initial request
        expect(mockPostMessage).toHaveBeenCalledTimes(1);
        
        // Advance timer
        act(() => {
            jest.advanceTimersByTime(500);
        });
        expect(mockPostMessage).toHaveBeenCalledTimes(2);
        
        act(() => {
            jest.advanceTimersByTime(500);
        });
        expect(mockPostMessage).toHaveBeenCalledTimes(3);
    });

    it('should handle memory data from worker', async () => {
        renderWithProviders(<MemoryViewer worker={mockWorker} />);
        
        const messageHandler = messageHandlers.get('message');
        if (messageHandler) {
            act(() => {
                messageHandler(new MessageEvent('message', {
                    data: {
                        type: WORKER_MESSAGES.MEMORY_RANGE_DATA,
                        data: {
                            start: 0x0000,
                            data: [0x41, 0x42, 0x43, 0x20, 0x21] // ABC  !
                        }
                    }
                }));
            });
        }
        
        await waitFor(() => {
            // Check hex values
            expect(screen.getByText('41')).toBeInTheDocument();
            expect(screen.getByText('42')).toBeInTheDocument();
            expect(screen.getByText('43')).toBeInTheDocument();
            expect(screen.getByText('20')).toBeInTheDocument();
            expect(screen.getByText('21')).toBeInTheDocument();
            
            // Check ASCII representation
            const asciiCells = screen.getAllByText(/ABC/);
            expect(asciiCells.length).toBeGreaterThan(0);
        });
    });

    it('should handle address input and navigation', async () => {
        renderWithProviders(<MemoryViewer worker={mockWorker} />);
        
        const addressInput = screen.getByPlaceholderText('0000') as HTMLInputElement;
        
        // Change address
        fireEvent.change(addressInput, { target: { value: 'FF00' } });
        expect(addressInput.value).toBe('FF00');
        
        // Submit with Enter
        fireEvent.keyDown(addressInput, { key: 'Enter' });
        
        await waitFor(() => {
            expect(mockPostMessage).toHaveBeenCalledWith({
                type: WORKER_MESSAGES.GET_MEMORY_RANGE,
                data: {
                    start: 0xFF00,
                    length: 256
                }
            });
        });
    });

    it('should handle navigation buttons', async () => {
        renderWithProviders(<MemoryViewer worker={mockWorker} startAddress={0x0100} size={256} />);
        
        const upButton = screen.getByText('↑');
        const downButton = screen.getByText('↓');
        
        // Click up button
        fireEvent.click(upButton);
        
        await waitFor(() => {
            expect(mockPostMessage).toHaveBeenCalledWith({
                type: WORKER_MESSAGES.GET_MEMORY_RANGE,
                data: {
                    start: 0x0000,
                    length: 256
                }
            });
        });
        
        // Click down button
        fireEvent.click(downButton);
        
        await waitFor(() => {
            expect(mockPostMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: WORKER_MESSAGES.GET_MEMORY_RANGE,
                    data: expect.objectContaining({
                        start: 0x0100
                    })
                })
            );
        });
    });

    it('should display memory address range', () => {
        renderWithProviders(<MemoryViewer worker={mockWorker} startAddress={0x1000} size={256} />);
        
        // Check address range display
        expect(screen.getByText('$1000 - $10FF')).toBeInTheDocument();
    });

    it('should handle cell editing click', async () => {
        renderWithProviders(<MemoryViewer worker={mockWorker} />);
        
        // Send some memory data first
        const messageHandler = messageHandlers.get('message');
        if (messageHandler) {
            act(() => {
                messageHandler(new MessageEvent('message', {
                    data: {
                        type: WORKER_MESSAGES.MEMORY_RANGE_DATA,
                        data: {
                            start: 0x0000,
                            data: [0x41, 0x42]
                        }
                    }
                }));
            });
        }
        
        await waitFor(() => {
            const cell = screen.getByText('41');
            fireEvent.click(cell.parentElement!);
            
            // Should show input field
            const input = screen.getByDisplayValue('41') as HTMLInputElement;
            expect(input).toBeInTheDocument();
            expect(input).toHaveFocus();
        });
    });

    it('should handle cell edit input', async () => {
        renderWithProviders(<MemoryViewer worker={mockWorker} />);
        
        // Send memory data
        const messageHandler = messageHandlers.get('message');
        if (messageHandler) {
            act(() => {
                messageHandler(new MessageEvent('message', {
                    data: {
                        type: WORKER_MESSAGES.MEMORY_RANGE_DATA,
                        data: {
                            start: 0x0000,
                            data: [0x41]
                        }
                    }
                }));
            });
        }
        
        await waitFor(() => {
            const cell = screen.getByText('41');
            fireEvent.click(cell.parentElement!);
        });
        
        const input = screen.getByDisplayValue('41') as HTMLInputElement;
        fireEvent.change(input, { target: { value: 'FF' } });
        expect(input.value).toBe('FF');
        
        // Complete edit with Enter
        fireEvent.keyDown(input, { key: 'Enter' });
        
        // Should close edit mode
        await waitFor(() => {
            expect(screen.queryByDisplayValue('FF')).not.toBeInTheDocument();
        });
    });

    it('should cancel edit on Escape', async () => {
        renderWithProviders(<MemoryViewer worker={mockWorker} />);
        
        // Send memory data
        const messageHandler = messageHandlers.get('message');
        if (messageHandler) {
            act(() => {
                messageHandler(new MessageEvent('message', {
                    data: {
                        type: WORKER_MESSAGES.MEMORY_RANGE_DATA,
                        data: {
                            start: 0x0000,
                            data: [0x41]
                        }
                    }
                }));
            });
        }
        
        await waitFor(() => {
            const cell = screen.getByText('41');
            fireEvent.click(cell.parentElement!);
        });
        
        const input = screen.getByDisplayValue('41') as HTMLInputElement;
        fireEvent.keyDown(input, { key: 'Escape' });
        
        // Should close edit mode without saving
        await waitFor(() => {
            expect(screen.queryByDisplayValue('41')).not.toBeInTheDocument();
            expect(screen.getByText('41')).toBeInTheDocument();
        });
    });

    it('should display ASCII representation correctly', async () => {
        renderWithProviders(<MemoryViewer worker={mockWorker} />);
        
        const messageHandler = messageHandlers.get('message');
        if (messageHandler) {
            act(() => {
                messageHandler(new MessageEvent('message', {
                    data: {
                        type: WORKER_MESSAGES.MEMORY_RANGE_DATA,
                        data: {
                            start: 0x0000,
                            data: [
                                0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48,
                                0x49, 0x4A, 0x4B, 0x4C, 0x4D, 0x4E, 0x4F, 0x50, // ABCDEFGHIJKLMNOP
                                0x00, 0x01, 0x1F, 0x20, 0x7E, 0x7F, 0xFF, 0x80,
                                0x90, 0xA0, 0xB0, 0xC0, 0xD0, 0xE0, 0xF0, 0x10  // Non-printable
                            ]
                        }
                    }
                }));
            });
        }
        
        await waitFor(() => {
            // First row should show ABCDEFGHIJKLMNOP
            const asciiCells = screen.getAllByText(/ABCDEFGHIJKLMNOP/);
            expect(asciiCells.length).toBeGreaterThan(0);
            
            // Non-printable characters should be shown as dots
            const dotCells = screen.getAllByText(/\.\.\./);
            expect(dotCells.length).toBeGreaterThan(0);
        });
    });

    it('should cleanup event listeners on unmount', () => {
        const { unmount } = renderWithProviders(<MemoryViewer worker={mockWorker} />);
        
        unmount();
        
        expect(mockRemoveEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    });

    it('should handle custom size prop', () => {
        renderWithProviders(<MemoryViewer worker={mockWorker} size={512} />);
        
        expect(mockPostMessage).toHaveBeenCalledWith({
            type: WORKER_MESSAGES.GET_MEMORY_RANGE,
            data: {
                start: 0x0000,
                length: 512
            }
        });
    });

    it('should filter non-hex characters in address input', () => {
        renderWithProviders(<MemoryViewer worker={mockWorker} />);
        
        const addressInput = screen.getByPlaceholderText('0000') as HTMLInputElement;
        
        fireEvent.change(addressInput, { target: { value: 'XYZ123GH' } });
        expect(addressInput.value).toBe('123'); // Only hex chars remain
    });

    it('should limit address input to 4 characters', () => {
        renderWithProviders(<MemoryViewer worker={mockWorker} />);
        
        const addressInput = screen.getByPlaceholderText('0000') as HTMLInputElement;
        
        // The component filters non-hex and limits to 4 chars
        fireEvent.change(addressInput, { target: { value: '1234' } });
        expect(addressInput.value).toBe('1234');
        
        // Try to add more characters - should not accept
        fireEvent.change(addressInput, { target: { value: '12345' } });
        expect(addressInput.value).toBe('1234'); // Still limited to 4 chars
    });

    it('should handle edge case at memory boundary', async () => {
        renderWithProviders(<MemoryViewer worker={mockWorker} startAddress={0xFF00} size={256} />);
        
        const downButton = screen.getByText('↓');
        fireEvent.click(downButton);
        
        // Should not go beyond 0xFFFF
        await waitFor(() => {
            expect(mockPostMessage).toHaveBeenCalledWith({
                type: WORKER_MESSAGES.GET_MEMORY_RANGE,
                data: {
                    start: 0xFF00, // Should stay at FF00
                    length: 256
                }
            });
        });
    });

    it('should display column headers correctly', () => {
        renderWithProviders(<MemoryViewer worker={mockWorker} />);
        
        // Check hex column headers 0-F
        for (let i = 0; i < 16; i++) {
            expect(screen.getByText(i.toString(16).toUpperCase())).toBeInTheDocument();
        }
    });

    it('should only allow hex characters in cell edit', async () => {
        renderWithProviders(<MemoryViewer worker={mockWorker} />);
        
        // Send memory data
        const messageHandler = messageHandlers.get('message');
        if (messageHandler) {
            act(() => {
                messageHandler(new MessageEvent('message', {
                    data: {
                        type: WORKER_MESSAGES.MEMORY_RANGE_DATA,
                        data: {
                            start: 0x0000,
                            data: [0x41]
                        }
                    }
                }));
            });
        }
        
        await waitFor(() => {
            const cell = screen.getByText('41');
            fireEvent.click(cell.parentElement!);
        });
        
        const input = screen.getByDisplayValue('41') as HTMLInputElement;
        fireEvent.change(input, { target: { value: 'GH' } });
        expect(input.value).toBe(''); // Non-hex chars filtered out
        
        fireEvent.change(input, { target: { value: 'AB' } });
        expect(input.value).toBe('AB'); // Hex chars allowed
    });
});