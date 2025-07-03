import '@testing-library/jest-dom/jest-globals';
import { render, screen, act } from '@testing-library/react';
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
        expect(screen.getByText('Type')).toBeInTheDocument(); // Table header
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
        
        // But should have the table structure
        expect(screen.getByText('Type')).toBeInTheDocument();
        expect(screen.getByText('Config & Live Data')).toBeInTheDocument();
    });

    it('should set up interval to request debug info when worker is provided', () => {
        render(<InspectorView root={mockInspectable} worker={mockWorker} />);
        
        // Fast forward time to trigger the interval
        act(() => {
            jest.advanceTimersByTime(600);
        });

        expect(mockWorker.postMessage).toHaveBeenCalledWith({
            data: '',
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
                        type: 'CPU',
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
                                REG: {
                                    PC: '0x1234',
                                    A: '0x56'
                                },
                                HW: {
                                    ADDR: '0x1000'
                                }
                            }
                        }
                    }
                });
            });
        }

        // Force re-render to show updated state
        rerender(<InspectorView root={mockInspectableWithCPU} worker={mockWorker} />);
        
        // Check that CPU debug data is integrated into the architecture tree
        expect(screen.getByText('REG_PC:')).toBeInTheDocument();
        expect(screen.getByText('0x1234')).toBeInTheDocument();
        expect(screen.getByText('REG_A:')).toBeInTheDocument();
        expect(screen.getByText('0x56')).toBeInTheDocument();
        expect(screen.getByText('HW_ADDR:')).toBeInTheDocument();
        expect(screen.getByText('0x1000')).toBeInTheDocument();
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
        expect(screen.getByText('Type')).toBeInTheDocument();
        expect(screen.getByText('Config & Live Data')).toBeInTheDocument();
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
        
        expect(screen.getByText('No config')).toBeInTheDocument();
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
});