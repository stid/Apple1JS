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
        
        // Don't use fake timers - let the component use real timers
        // but with a very large interval to prevent multiple triggers
    });
    
    afterEach(() => {
        vi.clearAllMocks();
    });
    
    describe('Rendering', () => {
        it('should render performance metrics', async () => {
            render(
                <PerformanceMetrics 
                    workerManager={mockWorkerManager as WorkerManager} 
                    updateInterval={999999} // Very large interval to prevent updates
                />
            );
            
            await waitFor(() => {
                expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
            });
        });
        
        it('should display current engine status', async () => {
            render(
                <PerformanceMetrics 
                    workerManager={mockWorkerManager as WorkerManager} 
                    updateInterval={999999}
                />
            );
            
            await waitFor(() => {
                expect(screen.getByText('Active Engine:')).toBeInTheDocument();
                expect(screen.getByText('JS')).toBeInTheDocument();
            });
        });
        
        it('should show current performance for active engine', async () => {
            render(
                <PerformanceMetrics
                    workerManager={mockWorkerManager as WorkerManager}
                    updateInterval={999999}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Current Performance')).toBeInTheDocument();
                // Should show formatted IPS (450K) for the active JS engine
                expect(screen.getByText(/450.*K.*IPS/)).toBeInTheDocument();
            });
        });
        
        it('should show WASM engine performance when WASM is active', async () => {
            // Update mock to have WASM as active engine
            mockEngineStatus = {
                currentEngine: 'WASM',
                availableEngines: ['JS', 'WASM'],
                switchCount: 5,
                lastSwitchTime: 12.5,
                wasmMetrics: {
                    instructionsExecuted: 2000000,
                    averageIPS: 2500000,
                    lastIPS: 2300000,
                    cyclesExecuted: 4000000,
                    memoryUsage: 1024 * 256 // 256KB
                }
            };
            mockWorkerManager.getEngineStatus = vi.fn().mockResolvedValue(mockEngineStatus);

            render(
                <PerformanceMetrics
                    workerManager={mockWorkerManager as WorkerManager}
                    updateInterval={999999}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Current Performance')).toBeInTheDocument();
                // Should show formatted IPS (2.30M) for active WASM engine (appears twice in UI)
                const ipsElements = screen.getAllByText(/2\.30M/);
                expect(ipsElements.length).toBeGreaterThan(0);
            });
        });
        
        it('should not render when engine status is null', async () => {
            mockWorkerManager.getEngineStatus = vi.fn().mockResolvedValue(null);
            
            const { container } = render(
                <PerformanceMetrics 
                    workerManager={mockWorkerManager as WorkerManager} 
                    updateInterval={999999}
                />
            );
            
            // Wait for the async getEngineStatus to resolve
            await waitFor(() => {
                expect(mockWorkerManager.getEngineStatus).toHaveBeenCalled();
            });
            
            expect(container.firstChild).toBeNull();
        });
    });
    
    describe('Details Toggle', () => {
        it('should toggle details visibility', async () => {
            render(
                <PerformanceMetrics 
                    workerManager={mockWorkerManager as WorkerManager} 
                    updateInterval={999999}
                />
            );
            
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
    
    describe('Number Formatting', () => {
        it('should format large IPS values correctly', async () => {
            mockEngineStatus.jsMetrics!.lastIPS = 5500000; // 5.5M
            // Remove wasmMetrics since we only show active engine (JS)
            delete mockEngineStatus.wasmMetrics;

            render(
                <PerformanceMetrics
                    workerManager={mockWorkerManager as WorkerManager}
                    updateInterval={999999}
                />
            );

            await waitFor(() => {
                // Should show formatted IPS for active JS engine
                const ipsElements = screen.getAllByText(/5\.50M/);
                expect(ipsElements.length).toBeGreaterThan(0);
            });
        });

        it('should format small IPS values correctly', async () => {
            mockEngineStatus.jsMetrics!.lastIPS = 500; // 500
            // Remove wasmMetrics since we only show active engine (JS)
            delete mockEngineStatus.wasmMetrics;
            
            render(
                <PerformanceMetrics 
                    workerManager={mockWorkerManager as WorkerManager} 
                    updateInterval={999999}
                />
            );
            
            await waitFor(() => {
                // Should show formatted IPS for active JS engine (500 is displayed as "500")
                const ipsElements = screen.getAllByText(/500/);
                expect(ipsElements.length).toBeGreaterThan(0);
            });
        });
    });
    
    describe('Engine-specific Displays', () => {
        it('should only show active engine metrics when WASM is not available', async () => {
            delete mockEngineStatus.wasmMetrics;
            mockEngineStatus.availableEngines = ['JS'];

            render(
                <PerformanceMetrics
                    workerManager={mockWorkerManager as WorkerManager}
                    updateInterval={999999}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Current Performance')).toBeInTheDocument();
                expect(screen.getByText('JS')).toBeInTheDocument();
                // No WASM-specific content should be shown
                expect(screen.queryByText('WASM')).not.toBeInTheDocument();
            });
        });
        
        it('should highlight active engine correctly', async () => {
            mockEngineStatus.currentEngine = 'WASM';
            
            render(
                <PerformanceMetrics 
                    workerManager={mockWorkerManager as WorkerManager} 
                    updateInterval={999999}
                />
            );
            
            await waitFor(() => {
                const activeIndicator = screen.getByText('WASM');
                expect(activeIndicator.className).toContain('bg-success');
            });
        });
    });
    
    describe('Error Handling', () => {
        it('should handle errors when fetching engine status', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            mockWorkerManager.getEngineStatus = vi.fn().mockRejectedValue(
                new Error('Failed to get status')
            );
            
            render(
                <PerformanceMetrics 
                    workerManager={mockWorkerManager as WorkerManager} 
                    updateInterval={999999}
                />
            );
            
            await waitFor(() => {
                expect(mockWorkerManager.getEngineStatus).toHaveBeenCalled();
            });
            
            consoleSpy.mockRestore();
        });
    });
});