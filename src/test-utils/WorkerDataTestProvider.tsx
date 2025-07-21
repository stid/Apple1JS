import React, { ReactNode } from 'react';
import { WorkerDataProvider } from '../contexts/WorkerDataContext';
import { WorkerManager } from '../services/WorkerManager';
import { vi } from 'vitest';

// Create a mock WorkerManager for tests
const createMockWorkerManager = (): WorkerManager => {
    const mockWorkerManager = new WorkerManager();
    
    // Override methods to return mock data
    mockWorkerManager.getDebugInfo = vi.fn().mockResolvedValue({
        cpu: {
            REG_PC: '$0200',
            REG_A: '$00',
            REG_X: '$00',
            REG_Y: '$00',
            REG_S: '$FF',
            FLAG_N: 'CLEAR',
            FLAG_V: 'CLEAR',
            FLAG_D: 'CLEAR',
            FLAG_I: 'SET',
            FLAG_Z: 'SET',
            FLAG_C: 'CLEAR',
        },
        pia: {},
        Bus: {},
        clock: {},
    });
    
    mockWorkerManager.getBreakpoints = vi.fn().mockResolvedValue([]);
    mockWorkerManager.readMemoryRange = vi.fn().mockResolvedValue(new Array(256).fill(0));
    mockWorkerManager.onEmulationStatus = vi.fn().mockResolvedValue(() => {});
    mockWorkerManager.setDebuggerActive = vi.fn().mockResolvedValue(undefined);
    
    return mockWorkerManager;
};

interface WorkerDataTestProviderProps {
    children: ReactNode;
    workerManager?: WorkerManager;
}

/**
 * Test wrapper that provides WorkerDataProvider with a mock WorkerManager
 */
export const WorkerDataTestProvider: React.FC<WorkerDataTestProviderProps> = ({ 
    children, 
    workerManager 
}) => {
    const manager = workerManager || createMockWorkerManager();
    
    return (
        <WorkerDataProvider workerManager={manager}>
            {children}
        </WorkerDataProvider>
    );
};

/**
 * Helper function to wrap components with WorkerDataProvider for testing
 */
export const withWorkerData = (component: ReactNode, workerManager?: WorkerManager) => {
    return workerManager ? (
        <WorkerDataTestProvider workerManager={workerManager}>
            {component}
        </WorkerDataTestProvider>
    ) : (
        <WorkerDataTestProvider>
            {component}
        </WorkerDataTestProvider>
    );
};