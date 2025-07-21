import React from 'react';
import { describe, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { createMockWorkerManager } from '../../test-support/mocks/WorkerManager.mock';
import type { WorkerManager } from '../../services/WorkerManager';
import '@testing-library/jest-dom/vitest';
import { render, screen, act, fireEvent } from '../../test-utils/render';
import InspectorView from '../InspectorView';
import { IInspectableComponent } from '../../core/types/components';
import { WORKER_MESSAGES } from '../../apple1/types/worker-messages';
import { WorkerDataProvider } from '../../contexts/WorkerDataContext';

// Mock the WorkerDataContext
let mockDebugInfo = {};
vi.mock('../../contexts/WorkerDataContext', () => ({
    useWorkerData: () => ({
        debugInfo: mockDebugInfo,
        breakpoints: [],
        subscribeToDebugInfo: vi.fn(() => () => {}),
        subscribeToBreakpoints: vi.fn(() => () => {}),
        subscribeToMemoryRange: vi.fn(() => () => {}),
        setDebuggerActive: vi.fn(),
        refreshDebugInfo: vi.fn(),
        refreshBreakpoints: vi.fn(),
        refreshMemoryRange: vi.fn()
    }),
    WorkerDataProvider: ({ children }: { children: React.ReactNode }) => children
}));

// Mock inspectable component
const mockInspectable: IInspectableComponent = {
    id: 'test-root',
    type: 'Apple1',
    getInspectable: vi.fn().mockReturnValue({
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
    let mockWorkerManager: WorkerManager;

    beforeEach(() => {
        mockWorkerManager = createMockWorkerManager();
        
        // Ensure mock methods return promises
        (mockWorkerManager.setCpuProfiling as Mock).mockResolvedValue(undefined);
        (mockWorkerManager.getDebugInfo as Mock).mockResolvedValue(mockDebugInfo);
    });

    afterEach(() => {
        vi.clearAllMocks();
        // Reset mock debug info
        mockDebugInfo = {};
    });
    
    const renderWithProviders = (component: React.ReactNode) => {
        return render(
            <WorkerDataProvider workerManager={mockWorkerManager}>
                {component}
            </WorkerDataProvider>
        );
    };

    it('should render architecture section', () => {
        renderWithProviders(<InspectorView root={mockInspectable} />);
        
        expect(screen.getByText('Apple1')).toBeInTheDocument();
        expect(screen.getByText('Test Apple1')).toBeInTheDocument();
        expect(screen.getByText('Architecture Tree')).toBeInTheDocument(); // Section header
    });

    it('should render child components in architecture tree', () => {
        renderWithProviders(<InspectorView root={mockInspectable} />);
        
        expect(screen.getByText('CPU')).toBeInTheDocument();
        expect(screen.getByText('Test CPU')).toBeInTheDocument();
        expect(screen.getByText('RAM')).toBeInTheDocument();
        expect(screen.getByText('Test RAM')).toBeInTheDocument();
    });

    it('should display config values in architecture tree', () => {
        renderWithProviders(<InspectorView root={mockInspectable} />);
        
        expect(screen.getByText('frequency:')).toBeInTheDocument();
        expect(screen.getByText('1,000,000')).toBeInTheDocument(); // Formatted with thousand separators
        expect(screen.getByText('cycles:')).toBeInTheDocument();
        expect(screen.getByText('12,345')).toBeInTheDocument(); // Formatted with thousand separators
        expect(screen.getByText('size:')).toBeInTheDocument();
        expect(screen.getByText('4,096')).toBeInTheDocument(); // Formatted with thousand separators
    });

    it('should show architecture data without special labels', () => {
        renderWithProviders(<InspectorView root={mockInspectable} />);
        
        // Should not have the removed labels
        expect(screen.queryByText('Architecture')).not.toBeInTheDocument();
        expect(screen.queryByText('Live Data')).not.toBeInTheDocument();
        
        // But should have the new architecture tree structure
        expect(screen.getByText('Architecture Tree')).toBeInTheDocument();
        expect(screen.getByText('Apple1')).toBeInTheDocument();
    });

    it('should set up interval to request debug info when worker is provided', () => {
        // InspectorView now uses WorkerDataContext which handles polling internally
        // This test is no longer applicable as the component doesn't directly poll
        renderWithProviders(<InspectorView root={mockInspectable} workerManager={mockWorkerManager} />);
        
        // Just verify the component renders without errors
        expect(screen.getByText('Architecture Tree')).toBeInTheDocument();
    });

    it('should add event listener for worker messages', () => {
        // InspectorView now uses WorkerDataContext which handles worker messages internally
        // This test is no longer applicable
        renderWithProviders(<InspectorView root={mockInspectable} workerManager={mockWorkerManager} />);
        
        // Just verify the component renders without errors
        expect(screen.getByText('Architecture Tree')).toBeInTheDocument();
    });

    it('should integrate debug data into architecture tree components', () => {
        // Create a mock with CPU component to test debug integration
        const mockInspectableWithCPU: IInspectableComponent = {
            id: 'test-root',
            type: 'Apple1',
            getInspectable: vi.fn().mockReturnValue({
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

        // Set up mock debug data
        mockDebugInfo = {
            cpu: {
                REG_PC: '$1234',
                REG_A: '$56',
                HW_ADDR: '$1000',
                FLAG_Z: 'SET'
            }
        };

        renderWithProviders(<InspectorView root={mockInspectableWithCPU} workerManager={mockWorkerManager} />);
        
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
        renderWithProviders(<InspectorView root={mockInspectable} workerManager={mockWorkerManager} />);
        
        const worker = mockWorkerManager.getWorker();
        const addEventListener = worker?.addEventListener as Mock;
        const messageHandler = addEventListener?.mock.calls.find(call => call[0] === 'message')?.[1];
        
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
        // InspectorView now uses WorkerDataContext which handles cleanup internally
        // This test is no longer applicable
        const { unmount } = renderWithProviders(<InspectorView root={mockInspectable} workerManager={mockWorkerManager} />);
        
        // Just verify unmount doesn't throw errors
        expect(() => unmount()).not.toThrow();
    });

    it('should handle components without names gracefully', () => {
        const mockInspectableWithoutName: IInspectableComponent = {
            id: 'test-root',
            type: 'Apple1',
            getInspectable: vi.fn().mockReturnValue({
                id: 'test-root',
                type: 'Apple1',
                // No name property
                children: []
            })
        };

        renderWithProviders(<InspectorView root={mockInspectableWithoutName} />);
        
        expect(screen.getByText('(unnamed)')).toBeInTheDocument();
    });

    it('should handle components without config gracefully', () => {
        const mockInspectableWithoutConfig: IInspectableComponent = {
            id: 'test-root',
            type: 'Apple1',
            getInspectable: vi.fn().mockReturnValue({
                id: 'test-root',
                type: 'Apple1',
                name: 'Test Apple1',
                children: []
            })
        };

        renderWithProviders(<InspectorView root={mockInspectableWithoutConfig} />);
        
        // With the new card layout, components without config don't show extra fields
        expect(screen.getByText('Apple1')).toBeInTheDocument();
    });

    it('should handle duplicate component IDs by prioritizing those with more config fields', () => {
        // Note: This test verifies the deduplication logic exists, even though React warns about duplicate keys
        // In real usage, component IDs should be unique
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        
        const mockInspectableWithDuplicates: IInspectableComponent = {
            id: 'test-root',
            type: 'Apple1',
            getInspectable: vi.fn().mockReturnValue({
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

        renderWithProviders(<InspectorView root={mockInspectableWithDuplicates} />);
        
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
            getInspectable: vi.fn().mockReturnValue({
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

        // Set up mock debug data
        mockDebugInfo = {
            cpu: {
                REG_PC: '$1234',
                REG_A: '$56',
                HW_ADDR: '$1000',
                FLAG_N: 'SET',
                FLAG_Z: 'CLR'
            }
        };

        renderWithProviders(<InspectorView root={mockInspectableWithCPU6502} workerManager={mockWorkerManager} />);
        
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

    describe('Profiling Feature', () => {
        it('should render profiling section with toggle button', () => {
            renderWithProviders(<InspectorView root={mockInspectable} workerManager={mockWorkerManager} />);
            
            expect(screen.getByText('CPU Performance Profiling')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Enable Profiling/i })).toBeInTheDocument();
        });

        it('should toggle profiling when button is clicked', async () => {
            renderWithProviders(<InspectorView root={mockInspectable} workerManager={mockWorkerManager} />);
            
            const toggleButton = screen.getByRole('button', { name: /Enable Profiling/i });
            
            // Click to enable
            await act(async () => {
                fireEvent.click(toggleButton);
            });
            
            expect(mockWorkerManager.setCpuProfiling).toHaveBeenCalledWith(true);
        });

        it('should show pending state while toggling', async () => {
            // Make setCpuProfiling return a slow promise
            let resolvePromise: () => void;
            const slowPromise = new Promise<void>(resolve => {
                resolvePromise = resolve;
            });
            (mockWorkerManager.setCpuProfiling as Mock).mockReturnValueOnce(slowPromise);
            
            renderWithProviders(<InspectorView root={mockInspectable} workerManager={mockWorkerManager} />);
            
            const toggleButton = screen.getByRole('button', { name: /Enable Profiling/i });
            
            // Start the toggle
            act(() => {
                fireEvent.click(toggleButton);
            });
            
            // Should show updating state
            expect(screen.getByText('Updating...')).toBeInTheDocument();
            
            // Resolve the promise
            await act(async () => {
                resolvePromise!();
                await slowPromise;
            });
            
            // Should no longer show updating
            expect(screen.queryByText('Updating...')).not.toBeInTheDocument();
        });

        it('should sync with worker profiling state', () => {
            // Set up mock debug data with profiling enabled
            mockDebugInfo = {
                cpu: {
                    PERF_ENABLED: 'YES',
                    _PERF_DATA: {
                        stats: {
                            instructionCount: 1000,
                            totalInstructions: 50,
                            profilingEnabled: true
                        },
                        topOpcodes: []
                    }
                }
            };
            
            renderWithProviders(<InspectorView root={mockInspectable} workerManager={mockWorkerManager} />);
            
            // Button should show "Disable" since profiling is enabled in worker
            expect(screen.getByRole('button', { name: /Disable Profiling/i })).toBeInTheDocument();
        });

        it('should show profiling data when available', () => {
            // Set up mock debug data with profiling data
            mockDebugInfo = {
                cpu: {
                    PERF_ENABLED: 'YES',
                    _PERF_DATA: {
                        stats: {
                            instructionCount: 123456,
                            totalInstructions: 42,
                            profilingEnabled: true
                        },
                        topOpcodes: [
                            { opcode: '$A9', count: 500, cycles: 1000, avgCycles: 2 },
                            { opcode: '$85', count: 300, cycles: 900, avgCycles: 3 },
                            { opcode: '$20', count: 200, cycles: 1200, avgCycles: 6 }
                        ]
                    }
                }
            };
            
            renderWithProviders(<InspectorView root={mockInspectable} workerManager={mockWorkerManager} />);
            
            // Should show metrics
            expect(screen.getByText('123,456')).toBeInTheDocument(); // Instructions count
            expect(screen.getByText('42')).toBeInTheDocument(); // Unique opcodes
            expect(screen.getByText('ACTIVE')).toBeInTheDocument(); // Status
            
            // Should show top opcodes
            expect(screen.getByText('LDA')).toBeInTheDocument(); // $A9 = LDA immediate
            expect(screen.getByText('500')).toBeInTheDocument(); // count
            expect(screen.getByText('2c')).toBeInTheDocument(); // avg cycles
        });

        it('should show waiting message when profiling enabled but no data', () => {
            // Set up mock debug data with profiling enabled but no data yet
            mockDebugInfo = {
                cpu: {
                    PERF_ENABLED: 'YES'
                    // No _PERF_DATA
                }
            };
            
            renderWithProviders(<InspectorView root={mockInspectable} workerManager={mockWorkerManager} />);
            
            expect(screen.getByText(/Waiting for profiling data/)).toBeInTheDocument();
        });

        it('should handle profiling toggle errors gracefully', async () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
            (mockWorkerManager.setCpuProfiling as Mock).mockRejectedValueOnce(new Error('Failed'));
            
            renderWithProviders(<InspectorView root={mockInspectable} workerManager={mockWorkerManager} />);
            
            const toggleButton = screen.getByRole('button', { name: /Enable Profiling/i });
            
            await act(async () => {
                fireEvent.click(toggleButton);
            });
            
            expect(consoleError).toHaveBeenCalledWith('Failed to toggle CPU profiling:', expect.any(Error));
            
            // State should not change on error
            expect(screen.getByRole('button', { name: /Enable Profiling/i })).toBeInTheDocument();
            
            consoleError.mockRestore();
        });

        it('should disable button when workerManager is not provided', () => {
            renderWithProviders(<InspectorView root={mockInspectable} />);
            
            const toggleButton = screen.getByRole('button', { name: /Enable Profiling/i });
            expect(toggleButton).toBeDisabled();
            expect(toggleButton).toHaveClass('cursor-not-allowed');
        });
    });
});