import { describe, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../App';
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
    AppContent: ({ workerManager }: { workerManager: WorkerManager }) => (
        <div data-testid="app-content">AppContent - WorkerManager: {workerManager ? 'yes' : 'no'}</div>
    )
}));

describe('App component', () => {
    let mockWorkerManager: WorkerManager;
    
    beforeEach(() => {
        mockWorkerManager = createMockWorkerManager();
    });
    
    it('should render with error boundary and navigation provider', () => {
        render(<App workerManager={mockWorkerManager} />);
        
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
        expect(screen.getByTestId('debugger-navigation-provider')).toBeInTheDocument();
        expect(screen.getByTestId('app-content')).toBeInTheDocument();
    });
    
    it('should pass props correctly to AppContent', () => {
        render(<App workerManager={mockWorkerManager} />);
        
        const appContent = screen.getByTestId('app-content');
        expect(appContent).toHaveTextContent('AppContent - WorkerManager: yes');
    });
    
    it('should have correct component hierarchy', () => {
        const { container } = render(<App workerManager={mockWorkerManager} />);
        
        // Check hierarchy: ErrorBoundary > DebuggerNavigationProvider > AppContent
        const errorBoundary = container.querySelector('[data-testid="error-boundary"]');
        expect(errorBoundary).toBeInTheDocument();
        
        const navigationProvider = errorBoundary?.querySelector('[data-testid="debugger-navigation-provider"]');
        expect(navigationProvider).toBeInTheDocument();
        
        const appContent = navigationProvider?.querySelector('[data-testid="app-content"]');
        expect(appContent).toBeInTheDocument();
    });
});
