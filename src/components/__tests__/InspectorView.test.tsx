import '@testing-library/jest-dom/jest-globals';
import { render, screen, act } from '../../test-utils/render';
import InspectorView from '../InspectorView';
import { IInspectableComponent } from '../../core/@types/IInspectableComponent';
import { WORKER_MESSAGES } from '../../apple1/TSTypes';

// Mock inspectable component
const mockInspectable: IInspectableComponent = {
    id: 'test-root',
    type: 'Apple1',
    getInspectable: jest.fn().mockReturnValue({
        id: 'test-root',
        type: 'Apple1',
        name: 'Test Apple1',
        children: [
            {
                id: 'test-cpu',
                type: 'CPU',
                name: 'Test CPU',
                frequency: 1000000,
                cycles: 12345,
            },
            {
                id: 'test-ram',
                type: 'RAM',
                name: 'Test RAM',
                size: 4096,
                children: []
            }
        ]
    })
};

describe('InspectorView component', () => {
    let mockWorker: Worker;

    beforeEach(() => {
        // Mock Worker
        mockWorker = {
            postMessage: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            terminate: jest.fn(),
            onmessage: null,
            onerror: null,
            onmessageerror: null,
        } as unknown as Worker;

        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.useRealTimers();
    });

    it('should render architecture section', () => {
        render(<InspectorView root={mockInspectable} />);
        
        expect(screen.getByText('Apple1')).toBeInTheDocument();
        expect(screen.getByText('Test Apple1')).toBeInTheDocument();
        expect(screen.getByText('Architecture Tree')).toBeInTheDocument(); // Section header
    });

    it('should render child components in architecture tree', () => {
        render(<InspectorView root={mockInspectable} />);
        
        expect(screen.getByText('CPU')).toBeInTheDocument();
        expect(screen.getByText('Test CPU')).toBeInTheDocument();
        expect(screen.getByText('RAM')).toBeInTheDocument();
        expect(screen.getByText('Test RAM')).toBeInTheDocument();
    });

    it('should display config values in architecture tree', () => {
        render(<InspectorView root={mockInspectable} />);
        
        expect(screen.getByText('frequency:')).toBeInTheDocument();
        expect(screen.getByText('1,000,000')).toBeInTheDocument(); // Formatted with thousand separators
        expect(screen.getByText('cycles:')).toBeInTheDocument();
        expect(screen.getByText('12,345')).toBeInTheDocument(); // Formatted with thousand separators
        expect(screen.getByText('size:')).toBeInTheDocument();
        expect(screen.getByText('4,096')).toBeInTheDocument(); // Formatted with thousand separators
    });

    it('should show architecture data without special labels', () => {
        render(<InspectorView root={mockInspectable} />);
        
        // Should not have the removed labels
        expect(screen.queryByText('Architecture')).not.toBeInTheDocument();
        expect(screen.queryByText('Live Data')).not.toBeInTheDocument();
        
        // But should have the new architecture tree structure
        expect(screen.getByText('Architecture Tree')).toBeInTheDocument();
        expect(screen.getByText('Apple1')).toBeInTheDocument();
    });

    it('should set up interval to request debug info when worker is provided', () => {
        render(<InspectorView root={mockInspectable} worker={mockWorker} />);
        
        // Fast forward time to trigger the interval
        act(() => {
            jest.advanceTimersByTime(600);
        });

        expect(mockWorker.postMessage).toHaveBeenCalledWith({
            type: WORKER_MESSAGES.DEBUG_INFO
        });
    });

    it('should add event listener for worker messages', () => {
        render(<InspectorView root={mockInspectable} worker={mockWorker} />);
        
        expect(mockWorker.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    });

    it('should integrate debug data into architecture tree components', () => {
        // Create a mock with CPU component to test debug integration
        const mockInspectableWithCPU: IInspectableComponent = {
            id: 'test-root',
            type: 'Apple1',
            getInspectable: jest.fn().mockReturnValue({
                id: 'test-root',
                type: 'Apple1',
                name: 'Test Apple1',
                children: [
                    {
                        id: 'test-cpu',
                        type: 'CPU6502',
                        name: 'Test CPU',
                        frequency: 1000000,
                        cycles: 12345,
                    }
                ]
            })
        };

        const { rerender } = render(<InspectorView root={mockInspectableWithCPU} worker={mockWorker} />);
        
        // Simulate receiving debug data for CPU
        const addEventListener = mockWorker.addEventListener as jest.Mock;
        const messageHandler = addEventListener.mock.calls.find(call => call[0] === 'message')?.[1];
        
        if (messageHandler) {
            act(() => {
                messageHandler({
                    data: {
                        type: WORKER_MESSAGES.DEBUG_INFO,
                        data: {
                            cpu: {
                                REG_PC: '$1234',
                                REG_A: '$56',
                                HW_ADDR: '$1000',
                                FLAG_Z: 'SET'
                            }
                        }
                    }
                });
            });
        }

        // Force re-render to show updated state
        rerender(<InspectorView root={mockInspectableWithCPU} worker={mockWorker} />);
        
        // Check that CPU debug data is integrated into the architecture tree
        expect(screen.getAllByText('REG_PC:').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('$1234').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('REG_A:').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('$56').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('HW_ADDR:').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('$1000').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('FLAG_Z:').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('SET').length).toBeGreaterThanOrEqual(1);
    });

    it('should handle empty debug data gracefully', () => {
        render(<InspectorView root={mockInspectable} worker={mockWorker} />);
        
        const addEventListener = mockWorker.addEventListener as jest.Mock;
        const messageHandler = addEventListener.mock.calls.find(call => call[0] === 'message')?.[1];
        
        if (messageHandler) {
            act(() => {
                messageHandler({
                    data: {
                        type: WORKER_MESSAGES.DEBUG_INFO,
                        data: {}
                    }
                });
            });
        }

        // Should still show architecture tree
        expect(screen.getByText('Architecture Tree')).toBeInTheDocument();
        expect(screen.getByText('Apple1')).toBeInTheDocument();
    });

    it('should clean up intervals and event listeners on unmount', () => {
        const { unmount } = render(<InspectorView root={mockInspectable} worker={mockWorker} />);
        
        unmount();
        
        expect(mockWorker.removeEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    });

    it('should handle components without names gracefully', () => {
        const mockInspectableWithoutName: IInspectableComponent = {
            id: 'test-root',
            type: 'Apple1',
            getInspectable: jest.fn().mockReturnValue({
                id: 'test-root',
                type: 'Apple1',
                // No name property
                children: []
            })
        };

        render(<InspectorView root={mockInspectableWithoutName} />);
        
        expect(screen.getByText('(unnamed)')).toBeInTheDocument();
    });

    it('should handle components without config gracefully', () => {
        const mockInspectableWithoutConfig: IInspectableComponent = {
            id: 'test-root',
            type: 'Apple1',
            getInspectable: jest.fn().mockReturnValue({
                id: 'test-root',
                type: 'Apple1',
                name: 'Test Apple1',
                children: []
            })
        };

        render(<InspectorView root={mockInspectableWithoutConfig} />);
        
        // With the new card layout, components without config don't show extra fields
        expect(screen.getByText('Apple1')).toBeInTheDocument();
    });

    it('should handle duplicate component IDs by prioritizing those with more config fields', () => {
        // Note: This test verifies the deduplication logic exists, even though React warns about duplicate keys
        // In real usage, component IDs should be unique
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
        
        const mockInspectableWithDuplicates: IInspectableComponent = {
            id: 'test-root',
            type: 'Apple1',
            getInspectable: jest.fn().mockReturnValue({
                id: 'test-root',
                type: 'Apple1',
                name: 'Test Apple1',
                children: [
                    {
                        id: 'cpu-1',
                        type: 'CPU',
                        name: 'CPU Basic',
                        frequency: 1000000,
                    },
                    {
                        id: 'cpu-1', // Same ID but different config
                        type: 'CPU',
                        name: 'CPU Advanced',
                        frequency: 1000000,
                        cycles: 12345, // More config fields
                        instructions: 999,
                    }
                ]
            })
        };

        render(<InspectorView root={mockInspectableWithDuplicates} />);
        
        // The deduplication logic should prefer the component with more config fields
        expect(screen.getByText('CPU Advanced')).toBeInTheDocument();
        expect(screen.getByText('cycles:')).toBeInTheDocument();
        expect(screen.getByText('instructions:')).toBeInTheDocument();
        
        consoleError.mockRestore();
    });

    it('should integrate debug data for CPU6502 component type', () => {
        // Test the real CPU6502 component type mapping
        const mockInspectableWithCPU6502: IInspectableComponent = {
            id: 'test-root',
            type: 'Apple1',
            getInspectable: jest.fn().mockReturnValue({
                id: 'test-root',
                type: 'Apple1',
                name: 'Test Apple1',
                children: [
                    {
                        id: 'test-cpu6502',
                        type: 'CPU6502',  // Real CPU6502 component type
                        name: '6502 CPU',
                        frequency: 1000000,
                        cycles: 12345,
                    }
                ]
            })
        };

        const { rerender } = render(<InspectorView root={mockInspectableWithCPU6502} worker={mockWorker} />);
        
        // Simulate receiving debug data for CPU6502 component
        const addEventListener = mockWorker.addEventListener as jest.Mock;
        const messageHandler = addEventListener.mock.calls.find(call => call[0] === 'message')?.[1];
        
        if (messageHandler) {
            act(() => {
                messageHandler({
                    data: {
                        type: WORKER_MESSAGES.DEBUG_INFO,
                        data: {
                            cpu: {
                                REG_PC: '$1234',
                                REG_A: '$56',
                                HW_ADDR: '$1000',
                                FLAG_N: 'SET',
                                FLAG_Z: 'CLR'
                            }
                        }
                    }
                });
            });
        }

        // Force re-render to show updated state
        rerender(<InspectorView root={mockInspectableWithCPU6502} worker={mockWorker} />);
        
        // Check that CPU6502 debug data is integrated - now appears in both CPU Registers section and architecture tree
        expect(screen.getAllByText('REG_PC:').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('$1234').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('REG_A:').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('$56').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('HW_ADDR:').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('$1000').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('FLAG_N:').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('SET').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('FLAG_Z:').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('CLR').length).toBeGreaterThanOrEqual(1);
    });
});