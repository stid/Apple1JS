import { describe, expect, beforeEach, vi } from 'vitest';
import { createMockWorkerManager } from '../../test-support/mocks/WorkerManager.mock';
import type { WorkerManager } from '../../services/WorkerManager';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import Main from '../Main';
import { IInspectableComponent } from '../../core/types/components';
import { APP_VERSION } from '../../version';

// Mock App component
vi.mock('../App', () => ({
    __esModule: true,
    default: ({
        workerManager,
        apple1Instance,
    }: {
        workerManager: WorkerManager;
        apple1Instance: IInspectableComponent | null;
    }) => (
        <div data-testid="mocked-app">
            App Component - WorkerManager: {workerManager ? 'yes' : 'no'}, Instance: {apple1Instance ? 'yes' : 'no'}
        </div>
    ),
}));

describe('Main component', () => {
    let mockWorkerManager: WorkerManager;
    let mockApple1Instance: IInspectableComponent;

    beforeEach(() => {
        mockWorkerManager = createMockWorkerManager();
        mockApple1Instance = {
            inspect: vi.fn().mockReturnValue({
                name: 'Apple1',
                state: {},
                metadata: { type: 'system' },
            }),
        } as unknown as IInspectableComponent;
    });

    it('should render with all required elements', () => {
        render(<Main workerManager={mockWorkerManager} apple1Instance={mockApple1Instance} />);

        // Check header exists
        expect(screen.getByRole('banner')).toBeInTheDocument();

        // Check title
        expect(screen.getByText(/Apple 1 :: JS Emulator/)).toBeInTheDocument();
        expect(screen.getByText('- by =stid=')).toBeInTheDocument();
        expect(screen.getByText(`v${APP_VERSION}`)).toBeInTheDocument();

        // Check App component is rendered
        expect(screen.getByTestId('mocked-app')).toBeInTheDocument();
        expect(screen.getByText(/App Component/)).toHaveTextContent(
            'App Component - WorkerManager: yes, Instance: yes',
        );
    });

    it('should render without apple1Instance', () => {
        render(<Main workerManager={mockWorkerManager} apple1Instance={null} />);

        expect(screen.getByTestId('mocked-app')).toHaveTextContent('App Component - WorkerManager: yes, Instance: no');
    });

    it('should have correct layout structure', () => {
        const { container } = render(<Main workerManager={mockWorkerManager} apple1Instance={mockApple1Instance} />);

        // Check root div has correct layout classes
        const rootDiv = container.firstChild as HTMLElement;
        expect(rootDiv).toHaveClass('w-full', 'h-screen', 'flex', 'flex-col', 'overflow-hidden');

        // Check header layout classes (token-backed surface + border)
        const header = screen.getByRole('banner');
        expect(header).toHaveClass(
            'flex-shrink-0',
            'w-full',
            'bg-surface-primary',
            'border-b',
            'border-border-primary',
        );

        // Check content container
        const contentDiv = rootDiv.children[1] as HTMLElement;
        expect(contentDiv).toHaveClass('flex-1', 'flex', 'overflow-hidden', 'min-h-0');
    });

    it('should pass correct props to App component', () => {
        const { rerender } = render(<Main workerManager={mockWorkerManager} apple1Instance={mockApple1Instance} />);

        // Initial render with instance
        expect(screen.getByTestId('mocked-app')).toHaveTextContent('WorkerManager: yes, Instance: yes');

        // Rerender without instance
        rerender(<Main workerManager={mockWorkerManager} apple1Instance={null} />);
        expect(screen.getByTestId('mocked-app')).toHaveTextContent('WorkerManager: yes, Instance: no');
    });

    it('should display version from version.ts', () => {
        render(<Main workerManager={mockWorkerManager} apple1Instance={mockApple1Instance} />);

        const versionElement = screen.getByText(`v${APP_VERSION}`);
        expect(versionElement).toBeInTheDocument();
        expect(versionElement).toHaveClass('text-xs', 'font-mono', 'text-text-muted');
    });

    it('should have proper title structure with different text styles', () => {
        render(<Main workerManager={mockWorkerManager} apple1Instance={mockApple1Instance} />);

        const titleElement = screen.getByRole('heading', { level: 1 });
        expect(titleElement).toHaveClass('text-base', 'font-mono', 'font-medium', 'tracking-wide', 'text-text-accent');

        const authorElement = screen.getByText('- by =stid=');
        expect(authorElement).toHaveClass('text-text-secondary', 'font-normal');
    });
});
