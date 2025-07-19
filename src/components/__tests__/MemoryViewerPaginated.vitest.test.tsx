import { describe, expect, beforeEach, vi, type Mock } from 'vitest';
import { createMockWorkerManager } from '../../test-support/mocks/WorkerManager.mock';
import { render, screen, fireEvent, waitFor, act } from '../../test-utils/render';
import MemoryViewerPaginated from '../MemoryViewerPaginated';
import type { WorkerManager } from '../../services/WorkerManager';

describe('MemoryViewerPaginated', () => {
    let mockWorkerManager: WorkerManager;

    beforeEach(() => {
        mockWorkerManager = createMockWorkerManager();
        vi.clearAllMocks();
        
        // Mock the getMemoryMap method used by the component
        (mockWorkerManager.getMemoryMap as Mock).mockResolvedValue({
            regions: [
                { name: 'RAM', start: 0x0000, end: 0x0FFF, type: 'ram' },
                { name: 'ROM', start: 0xF000, end: 0xFFFF, type: 'rom' }
            ]
        });
        
        // Mock readMemoryRange method to return test data
        (mockWorkerManager.readMemoryRange as Mock).mockImplementation((start: number, length: number) => {
            const data = new Array(length).fill(0).map((_, i) => (start + i) % 256);
            return Promise.resolve(data);
        });
    });

    it('renders with initial address', async () => {
        await act(async () => {
            render(
                <MemoryViewerPaginated workerManager={mockWorkerManager} startAddress={0x1000} />
            );
        });
        
        await waitFor(() => {
            const addressInput = screen.getByPlaceholderText('0000') as HTMLInputElement;
            expect(addressInput.value).toBe('1000');
        });
    });

    it('uses external address when provided', async () => {
        await act(async () => {
            render(
                <MemoryViewerPaginated 
                    workerManager={mockWorkerManager} 
                    startAddress={0x1000}
                    currentAddress={0x2000}
                />
            );
        });
        
        await waitFor(() => {
            const addressInput = screen.getByPlaceholderText('0000') as HTMLInputElement;
            expect(addressInput.value).toBe('2000');
        });
    });

    it('calls onAddressChange when address changes', async () => {
        const onAddressChange = vi.fn();
        render(
                <MemoryViewerPaginated 
                    workerManager={mockWorkerManager} 
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
        const onAddressChange = vi.fn();
        await act(async () => {
            render(
                <MemoryViewerPaginated 
                    workerManager={mockWorkerManager} 
                    currentAddress={0x1000}
                    onAddressChange={onAddressChange}
                />
            );
        });
        
        // Wait for initial render and memory load
        await waitFor(() => {
            expect(mockWorkerManager.readMemoryRange).toHaveBeenCalled();
        });
        
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

    it('does not cause flickering with external address changes', async () => {
        const onAddressChange = vi.fn();
        let rerender: ReturnType<typeof render>['rerender'];
        
        await act(async () => {
            const result = render(
                <MemoryViewerPaginated 
                    workerManager={mockWorkerManager} 
                    currentAddress={0x1000}
                    onAddressChange={onAddressChange}
                />
            );
            rerender = result.rerender;
        });
        
        // Wait for initial load
        await waitFor(() => {
            expect(mockWorkerManager.readMemoryRange).toHaveBeenCalled();
        });
        
        // Clear initial calls
        onAddressChange.mockClear();
        
        // Re-render with same address - should not trigger onChange
        await act(async () => {
            rerender(
                <MemoryViewerPaginated 
                    workerManager={mockWorkerManager} 
                    currentAddress={0x1000}
                    onAddressChange={onAddressChange}
                />
            );
        });
        
        expect(onAddressChange).not.toHaveBeenCalled();
    });

    it('displays memory data correctly', async () => {
        await act(async () => {
            render(
                <MemoryViewerPaginated workerManager={mockWorkerManager} />
            );
        });
        
        // Wait for memory data to load
        await waitFor(() => {
            expect(mockWorkerManager.readMemoryRange).toHaveBeenCalled();
        });
        
        // Check that hex values are displayed (00 appears multiple times, use getAllByText)
        await waitFor(() => {
            const hexValues = screen.getAllByText('00');
            expect(hexValues.length).toBeGreaterThan(0);
        });
        
        // Check that ASCII column exists
        expect(screen.getByText('ASCII')).toBeInTheDocument();
    });

    it('handles address input validation', async () => {
        await act(async () => {
            render(
                <MemoryViewerPaginated workerManager={mockWorkerManager} />
            );
        });
        
        await waitFor(() => {
            expect(mockWorkerManager.readMemoryRange).toHaveBeenCalled();
        });
        
        const addressInput = screen.getByPlaceholderText('0000') as HTMLInputElement;
        
        // Try to enter invalid characters
        fireEvent.change(addressInput, { target: { value: 'GGGG' } });
        expect(addressInput.value).toBe(''); // Should reject non-hex characters
        
        // Enter valid hex
        fireEvent.change(addressInput, { target: { value: 'ABCD' } });
        expect(addressInput.value).toBe('ABCD');
    });

    it('limits address input to 4 characters', async () => {
        await act(async () => {
            render(
                <MemoryViewerPaginated workerManager={mockWorkerManager} />
            );
        });
        
        await waitFor(() => {
            expect(mockWorkerManager.readMemoryRange).toHaveBeenCalled();
        });
        
        const addressInput = screen.getByPlaceholderText('0000') as HTMLInputElement;
        
        // Set 4 characters - should work
        fireEvent.change(addressInput, { target: { value: '1234' } });
        expect(addressInput.value).toBe('1234');
        
        // Try to set more than 4 characters - should keep previous value
        fireEvent.change(addressInput, { target: { value: '12345' } });
        expect(addressInput.value).toBe('1234'); // Component ignores inputs > 4 chars
    });
});