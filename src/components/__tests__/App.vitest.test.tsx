import { describe, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../App';
import { IInspectableComponent } from '../../core/types/components';
import { createMockWorkerManager } from '../../test-support/mocks/WorkerManager.mock';
import type { WorkerManager } from '../../services/WorkerManager';

// Mock child components
vi.mock('../Error', () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => <div data-testid="error-boundary">{children}</div>
}));

vi.mock('../../contexts/DebuggerNavigationContext', () => ({
    DebuggerNavigationProvider: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="debugger-navigation-provider">{children}</div>
    )
}));

vi.mock('../AppContent', () => ({
    AppContent: ({ workerManager, apple1Instance }: { workerManager: WorkerManager; apple1Instance?: IInspectableComponent | null }) => (
        <div data-testid="app-content">
            AppContent - WorkerManager: {workerManager ? 'yes' : 'no'}, Instance: {apple1Instance ? 'yes' : 'no'}
        </div>
    )
}));

describe('App component', () => {
    let mockWorkerManager: WorkerManager;
    let mockApple1Instance: IInspectableComponent;
    
    beforeEach(() => {
        mockWorkerManager = createMockWorkerManager();
        mockApple1Instance = {
            inspect: vi.fn().mockReturnValue({
                name: 'Apple1',
                state: {},
                metadata: { type: 'system' }
            })
        } as unknown as IInspectableComponent;
    });
    
    it('should render with error boundary and navigation provider', () => {
        render(<App workerManager={mockWorkerManager} apple1Instance={mockApple1Instance} />);
        
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
        expect(screen.getByTestId('debugger-navigation-provider')).toBeInTheDocument();
        expect(screen.getByTestId('app-content')).toBeInTheDocument();
    });
    
    it('should pass props correctly to AppContent', () => {
        render(<App workerManager={mockWorkerManager} apple1Instance={mockApple1Instance} />);
        
        const appContent = screen.getByTestId('app-content');
        expect(appContent).toHaveTextContent('AppContent - WorkerManager: yes, Instance: yes');
    });
    
    it('should render without apple1Instance', () => {
        render(<App workerManager={mockWorkerManager} />);
        
        const appContent = screen.getByTestId('app-content');
        expect(appContent).toHaveTextContent('AppContent - WorkerManager: yes, Instance: no');
    });
    
    it('should render with null apple1Instance', () => {
        render(<App workerManager={mockWorkerManager} apple1Instance={null} />);
        
        const appContent = screen.getByTestId('app-content');
        expect(appContent).toHaveTextContent('AppContent - WorkerManager: yes, Instance: no');
    });
    
    it('should have correct component hierarchy', () => {
        const { container } = render(<App workerManager={mockWorkerManager} apple1Instance={mockApple1Instance} />);
        
        // Check hierarchy: ErrorBoundary > DebuggerNavigationProvider > AppContent
        const errorBoundary = container.querySelector('[data-testid="error-boundary"]');
        expect(errorBoundary).toBeInTheDocument();
        
        const navigationProvider = errorBoundary?.querySelector('[data-testid="debugger-navigation-provider"]');
        expect(navigationProvider).toBeInTheDocument();
        
        const appContent = navigationProvider?.querySelector('[data-testid="app-content"]');
        expect(appContent).toBeInTheDocument();
    });
    
    it('should update when props change', () => {
        const { rerender } = render(<App workerManager={mockWorkerManager} apple1Instance={mockApple1Instance} />);
        
        expect(screen.getByTestId('app-content')).toHaveTextContent('Instance: yes');
        
        rerender(<App workerManager={mockWorkerManager} apple1Instance={null} />);
        expect(screen.getByTestId('app-content')).toHaveTextContent('Instance: no');
    });
});