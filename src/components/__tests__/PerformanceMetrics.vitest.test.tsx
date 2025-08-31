import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PerformanceMetrics from '../PerformanceMetrics';
import type { WorkerManager } from '../../services/WorkerManager';
import type { EngineStatusData } from '../../apple1/types/worker-messages';

// Mock the logging service
vi.mock('../../services/LoggingService', () => ({
    loggingService: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
    }
}));

describe('PerformanceMetrics', () => {
    let mockWorkerManager: Partial<WorkerManager>;
    let mockEngineStatus: EngineStatusData;
    
    beforeEach(() => {
        // Setup default engine status
        mockEngineStatus = {
            currentEngine: 'JS',
            availableEngines: ['JS', 'WASM'],
            switchCount: 5,
            lastSwitchTime: 12.5,
            autoSwitchEnabled: false,
            jsMetrics: {
                instructionsExecuted: 1000000,
                averageIPS: 500000,
                lastIPS: 450000,
                cyclesExecuted: 2000000,
                memoryUsage: 1024 * 512 // 512KB
            },
            wasmMetrics: {
                instructionsExecuted: 2000000,
                averageIPS: 2500000,
                lastIPS: 2300000,
                cyclesExecuted: 4000000,
                memoryUsage: 1024 * 256 // 256KB
            }
        };
        
        // Setup mock worker manager
        mockWorkerManager = {
            getEngineStatus: vi.fn().mockResolvedValue(mockEngineStatus)
        };
        
        // Clear all timers
        vi.clearAllTimers();
        vi.useFakeTimers();
    });
    
    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });
    
    describe('Rendering', () => {
        it('should render performance metrics', async () => {
            render(<PerformanceMetrics workerManager={mockWorkerManager as WorkerManager} />);
            
            await waitFor(() => {
                expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
            });
        });
        
        it('should display current engine status', async () => {
            render(<PerformanceMetrics workerManager={mockWorkerManager as WorkerManager} />);
            
            await waitFor(() => {
                expect(screen.getByText('Active Engine:')).toBeInTheDocument();
                expect(screen.getByText('JS')).toBeInTheDocument();
            });
        });
        
        it('should show JS engine metrics when available', async () => {
            render(<PerformanceMetrics workerManager={mockWorkerManager as WorkerManager} />);
            
            await waitFor(() => {
                expect(screen.getByText('JS Engine')).toBeInTheDocument();
                // Should show formatted IPS (450K)
                expect(screen.getByText(/450.*K.*IPS/)).toBeInTheDocument();
            });
        });
        
        it('should show WASM engine metrics when available', async () => {
            render(<PerformanceMetrics workerManager={mockWorkerManager as WorkerManager} />);
            
            await waitFor(() => {
                expect(screen.getByText('WASM Engine')).toBeInTheDocument();
                // Should show formatted IPS (2.30M)
                expect(screen.getByText(/2\.30M/)).toBeInTheDocument();
            });
        });
        
        it('should calculate and display speedup', async () => {
            render(<PerformanceMetrics workerManager={mockWorkerManager as WorkerManager} />);
            
            await waitFor(() => {
                expect(screen.getByText('WASM Speedup:')).toBeInTheDocument();
                // Speedup should be ~5.11x (2300000 / 450000)
                expect(screen.getByText(/5\.11x/)).toBeInTheDocument();
            });
        });
        
        it('should not render when engine status is null', () => {
            mockWorkerManager.getEngineStatus = vi.fn().mockResolvedValue(null);
            
            const { container } = render(
                <PerformanceMetrics workerManager={mockWorkerManager as WorkerManager} />
            );
            
            expect(container.firstChild).toBeNull();
        });
    });
    
    describe('Details Toggle', () => {
        it('should toggle details visibility', async () => {
            render(<PerformanceMetrics workerManager={mockWorkerManager as WorkerManager} />);
            
            await waitFor(() => {
                expect(screen.getByText('Show Details')).toBeInTheDocument();
            });
            
            // Initially details should not be visible
            expect(screen.queryByText('Statistics')).not.toBeInTheDocument();
            
            // Click to show details
            fireEvent.click(screen.getByText('Show Details'));
            
            await waitFor(() => {
                expect(screen.getByText('Hide Details')).toBeInTheDocument();
                expect(screen.getByText('Statistics')).toBeInTheDocument();
            });
            
            // Click to hide details
            fireEvent.click(screen.getByText('Hide Details'));
            
            await waitFor(() => {
                expect(screen.getByText('Show Details')).toBeInTheDocument();
                expect(screen.queryByText('Statistics')).not.toBeInTheDocument();
            });
        });
    });
    
    describe('Detailed Statistics', () => {
        beforeEach(async () => {
            render(<PerformanceMetrics workerManager={mockWorkerManager as WorkerManager} />);
            
            await waitFor(() => {
                fireEvent.click(screen.getByText('Show Details'));
            });
        });
        
        it('should display instructions executed', async () => {
            await waitFor(() => {
                expect(screen.getByText('JS Instructions:')).toBeInTheDocument();
                expect(screen.getByText('1.00M')).toBeInTheDocument();
                
                expect(screen.getByText('WASM Instructions:')).toBeInTheDocument();
                expect(screen.getByText('2.00M')).toBeInTheDocument();
            });
        });
        
        it('should display memory usage', async () => {
            await waitFor(() => {
                expect(screen.getByText('JS Memory:')).toBeInTheDocument();
                expect(screen.getByText('512.0 KB')).toBeInTheDocument();
                
                expect(screen.getByText('WASM Memory:')).toBeInTheDocument();
                expect(screen.getByText('256.0 KB')).toBeInTheDocument();
            });
        });
        
        it('should display switch statistics', async () => {
            await waitFor(() => {
                expect(screen.getByText('Engine Switches:')).toBeInTheDocument();
                expect(screen.getByText('5')).toBeInTheDocument();
                
                expect(screen.getByText('Last Switch:')).toBeInTheDocument();
                expect(screen.getByText('12.5ms')).toBeInTheDocument();
            });
        });
    });
    
    describe('Performance History', () => {
        it('should accumulate history over time', async () => {
            render(
                <PerformanceMetrics 
                    workerManager={mockWorkerManager as WorkerManager} 
                    updateInterval={100}
                />
            );
            
            // Wait for initial render
            await waitFor(() => {
                expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
            });
            
            // Advance time to trigger updates
            vi.advanceTimersByTime(100);
            await waitFor(() => {});
            
            vi.advanceTimersByTime(100);
            await waitFor(() => {});
            
            // Show details to see history
            fireEvent.click(screen.getByText('Show Details'));
            
            // Performance History should be visible after accumulating data points
            await waitFor(() => {
                const historySection = screen.queryByText('Performance History');
                expect(historySection).toBeInTheDocument();
            });
        });
    });
    
    describe('Update Interval', () => {
        it('should respect custom update interval', async () => {
            const getEngineStatusSpy = vi.fn().mockResolvedValue(mockEngineStatus);
            mockWorkerManager.getEngineStatus = getEngineStatusSpy;
            
            render(
                <PerformanceMetrics 
                    workerManager={mockWorkerManager as WorkerManager}
                    updateInterval={500}
                />
            );
            
            // Wait for initial call
            await waitFor(() => {
                expect(getEngineStatusSpy).toHaveBeenCalledTimes(1);
            });
            
            // Advance by less than interval - should not call again
            vi.advanceTimersByTime(400);
            expect(getEngineStatusSpy).toHaveBeenCalledTimes(1);
            
            // Advance to complete interval
            vi.advanceTimersByTime(100);
            await waitFor(() => {
                expect(getEngineStatusSpy).toHaveBeenCalledTimes(2);
            });
        });
        
        it('should use default interval when not specified', async () => {
            const getEngineStatusSpy = vi.fn().mockResolvedValue(mockEngineStatus);
            mockWorkerManager.getEngineStatus = getEngineStatusSpy;
            
            render(
                <PerformanceMetrics workerManager={mockWorkerManager as WorkerManager} />
            );
            
            // Wait for initial call
            await waitFor(() => {
                expect(getEngineStatusSpy).toHaveBeenCalledTimes(1);
            });
            
            // Advance by default interval (1000ms)
            vi.advanceTimersByTime(1000);
            await waitFor(() => {
                expect(getEngineStatusSpy).toHaveBeenCalledTimes(2);
            });
        });
    });
    
    describe('Error Handling', () => {
        it('should handle errors when fetching engine status', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            mockWorkerManager.getEngineStatus = vi.fn().mockRejectedValue(
                new Error('Failed to get status')
            );
            
            render(<PerformanceMetrics workerManager={mockWorkerManager as WorkerManager} />);
            
            await waitFor(() => {
                expect(mockWorkerManager.getEngineStatus).toHaveBeenCalled();
            });
            
            consoleSpy.mockRestore();
        });
    });
    
    describe('Performance Bars', () => {
        it('should render performance bars with correct widths', async () => {
            render(<PerformanceMetrics workerManager={mockWorkerManager as WorkerManager} />);
            
            await waitFor(() => {
                const bars = screen.getByText('Performance Metrics')
                    .closest('.bg-surface-primary')
                    ?.querySelectorAll('.bg-surface-secondary');
                
                expect(bars).toHaveLength(2); // JS and WASM bars
            });
        });
    });
    
    describe('Number Formatting', () => {
        it('should format large IPS values correctly', async () => {
            mockEngineStatus.jsMetrics!.lastIPS = 5500000; // 5.5M
            mockEngineStatus.wasmMetrics!.lastIPS = 12300000; // 12.3M
            
            render(<PerformanceMetrics workerManager={mockWorkerManager as WorkerManager} />);
            
            await waitFor(() => {
                expect(screen.getByText(/5\.50M.*IPS/)).toBeInTheDocument();
                expect(screen.getByText(/12\.30M/)).toBeInTheDocument();
            });
        });
        
        it('should format small IPS values correctly', async () => {
            mockEngineStatus.jsMetrics!.lastIPS = 500; // 500
            mockEngineStatus.wasmMetrics!.lastIPS = 1500; // 1.5K
            
            render(<PerformanceMetrics workerManager={mockWorkerManager as WorkerManager} />);
            
            await waitFor(() => {
                expect(screen.getByText(/500.*IPS/)).toBeInTheDocument();
                expect(screen.getByText(/1\.5K/)).toBeInTheDocument();
            });
        });
        
        it('should format memory in MB when large', async () => {
            mockEngineStatus.jsMetrics!.memoryUsage = 2 * 1024 * 1024; // 2MB
            
            render(<PerformanceMetrics workerManager={mockWorkerManager as WorkerManager} />);
            
            await waitFor(() => {
                fireEvent.click(screen.getByText('Show Details'));
            });
            
            await waitFor(() => {
                expect(screen.getByText('2.00 MB')).toBeInTheDocument();
            });
        });
    });
    
    describe('Engine-specific Displays', () => {
        it('should only show JS metrics when WASM is not available', async () => {
            delete mockEngineStatus.wasmMetrics;
            mockEngineStatus.availableEngines = ['JS'];
            
            render(<PerformanceMetrics workerManager={mockWorkerManager as WorkerManager} />);
            
            await waitFor(() => {
                expect(screen.getByText('JS Engine')).toBeInTheDocument();
                expect(screen.queryByText('WASM Engine')).not.toBeInTheDocument();
                expect(screen.queryByText('WASM Speedup:')).not.toBeInTheDocument();
            });
        });
        
        it('should highlight active engine correctly', async () => {
            mockEngineStatus.currentEngine = 'WASM';
            
            render(<PerformanceMetrics workerManager={mockWorkerManager as WorkerManager} />);
            
            await waitFor(() => {
                const activeIndicator = screen.getByText('WASM');
                expect(activeIndicator.className).toContain('bg-success');
            });
        });
    });
    
    describe('Cleanup', () => {
        it('should clear interval on unmount', async () => {
            const { unmount } = render(
                <PerformanceMetrics workerManager={mockWorkerManager as WorkerManager} />
            );
            
            await waitFor(() => {
                expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
            });
            
            unmount();
            
            // Advance timers - should not call getEngineStatus again
            const callCount = vi.mocked(mockWorkerManager.getEngineStatus!).mock.calls.length;
            vi.advanceTimersByTime(5000);
            expect(vi.mocked(mockWorkerManager.getEngineStatus!).mock.calls.length).toBe(callCount);
        });
    });
});