import { render, screen, fireEvent, waitFor, act } from '../../test-utils/render';
import MemoryViewerPaginated from '../MemoryViewerPaginated';
import { WORKER_MESSAGES } from '../../apple1/TSTypes';

describe('MemoryViewerPaginated', () => {
    const mockWorker = {
        postMessage: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
    } as unknown as Worker;

    let messageHandler: (event: MessageEvent) => void;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Capture the message handler
        mockWorker.addEventListener = jest.fn((event: string, handler: EventListenerOrEventListenerObject) => {
            if (event === 'message' && typeof handler === 'function') {
                messageHandler = handler as (event: MessageEvent) => void;
            }
        });
    });

    const simulateMemoryData = (start: number, length: number) => {
        const data = new Array(length).fill(0).map((_, i) => (start + i) % 256);
        act(() => {
            messageHandler(new MessageEvent('message', {
                data: {
                    type: WORKER_MESSAGES.MEMORY_RANGE_DATA,
                    data: { start, data }
                }
            }));
        });
    };

    it('renders with initial address', () => {
        render(
                <MemoryViewerPaginated worker={mockWorker} startAddress={0x1000} />
        );
        
        const addressInput = screen.getByPlaceholderText('0000') as HTMLInputElement;
        expect(addressInput.value).toBe('1000');
    });

    it('uses external address when provided', () => {
        render(
                <MemoryViewerPaginated 
                    worker={mockWorker} 
                    startAddress={0x1000}
                    currentAddress={0x2000}
                />
        );
        
        const addressInput = screen.getByPlaceholderText('0000') as HTMLInputElement;
        expect(addressInput.value).toBe('2000');
    });

    it('calls onAddressChange when address changes', async () => {
        const onAddressChange = jest.fn();
        render(
                <MemoryViewerPaginated 
                    worker={mockWorker} 
                    onAddressChange={onAddressChange}
                />
        );
        
        const addressInput = screen.getByPlaceholderText('0000') as HTMLInputElement;
        
        // Change address via input
        fireEvent.change(addressInput, { target: { value: '5678' } });
        fireEvent.keyDown(addressInput, { key: 'Enter' });
        
        await waitFor(() => {
            expect(onAddressChange).toHaveBeenCalledWith(0x5678);
        });
    });

    it('navigates with arrow buttons', async () => {
        const onAddressChange = jest.fn();
        render(
                <MemoryViewerPaginated 
                    worker={mockWorker} 
                    currentAddress={0x1000}
                    onAddressChange={onAddressChange}
                />
        );
        
        // Simulate memory data
        simulateMemoryData(0x1000, 256);
        
        // Click down arrow
        const downButton = screen.getByTitle('Next page (↓)');
        fireEvent.click(downButton);
        
        await waitFor(() => {
            // Should advance by the visible size
            expect(onAddressChange).toHaveBeenCalled();
            const lastCall = onAddressChange.mock.calls[onAddressChange.mock.calls.length - 1];
            expect(lastCall[0]).toBeGreaterThan(0x1000);
        });
    });

    it('does not cause flickering with external address changes', () => {
        const onAddressChange = jest.fn();
        const { rerender } = render(
                <MemoryViewerPaginated 
                    worker={mockWorker} 
                    currentAddress={0x1000}
                    onAddressChange={onAddressChange}
                />
        );
        
        // Clear initial calls
        onAddressChange.mockClear();
        
        // Re-render with same address - should not trigger onChange
        rerender(
                <MemoryViewerPaginated 
                    worker={mockWorker} 
                    currentAddress={0x1000}
                    onAddressChange={onAddressChange}
                />
        );
        
        expect(onAddressChange).not.toHaveBeenCalled();
    });

    it('displays memory data correctly', () => {
        render(
                <MemoryViewerPaginated worker={mockWorker} />
        );
        
        // Simulate memory data
        simulateMemoryData(0x0000, 256);
        
        // Check that hex values are displayed (00 appears multiple times, use getAllByText)
        const hexValues = screen.getAllByText('00');
        expect(hexValues.length).toBeGreaterThan(0);
        
        // Check that ASCII column exists
        expect(screen.getByText('ASCII')).toBeInTheDocument();
    });

    it('handles address input validation', () => {
        render(
                <MemoryViewerPaginated worker={mockWorker} />
        );
        
        const addressInput = screen.getByPlaceholderText('0000') as HTMLInputElement;
        
        // Try to enter invalid characters
        fireEvent.change(addressInput, { target: { value: 'GGGG' } });
        expect(addressInput.value).toBe(''); // Should reject non-hex characters
        
        // Enter valid hex
        fireEvent.change(addressInput, { target: { value: 'ABCD' } });
        expect(addressInput.value).toBe('ABCD');
    });

    it('limits address input to 4 characters', () => {
        render(
                <MemoryViewerPaginated worker={mockWorker} />
        );
        
        const addressInput = screen.getByPlaceholderText('0000') as HTMLInputElement;
        
        // Set 4 characters - should work
        fireEvent.change(addressInput, { target: { value: '1234' } });
        expect(addressInput.value).toBe('1234');
        
        // Try to set more than 4 characters - should keep previous value
        fireEvent.change(addressInput, { target: { value: '12345' } });
        expect(addressInput.value).toBe('1234'); // Component ignores inputs > 4 chars
    });
});