import { describe, expect, beforeEach, vi } from 'vitest';
import { createMockWorkerManager } from '../../test-support/mocks/WorkerManager.mock';
import type { WorkerManager } from '../../services/WorkerManager';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import Main from '../Main';
import { APP_VERSION } from '../../version';

// Mock App component
vi.mock('../App', () => ({
    __esModule: true,
    default: ({ workerManager }: { workerManager: WorkerManager }) => (
        <div data-testid="mocked-app">App Component - WorkerManager: {workerManager ? 'yes' : 'no'}</div>
    ),
}));

describe('Main component', () => {
    let mockWorkerManager: WorkerManager;

    beforeEach(() => {
        mockWorkerManager = createMockWorkerManager();
    });

    it('should render with all required elements', () => {
        render(<Main workerManager={mockWorkerManager} />);

        expect(screen.getByRole('banner')).toBeInTheDocument();

        // Wordmark, tagline, version
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('apple1js');
        expect(screen.getByText(/apple-1 emulator/)).toBeInTheDocument();
        expect(screen.getByText(`v${APP_VERSION}`)).toBeInTheDocument();

        // Check App component is rendered
        expect(screen.getByTestId('mocked-app')).toBeInTheDocument();
        expect(screen.getByText(/App Component/)).toHaveTextContent('App Component - WorkerManager: yes');
    });

    it('should have correct layout structure', () => {
        const { container } = render(<Main workerManager={mockWorkerManager} />);

        // Check root div has correct layout classes
        const rootDiv = container.firstChild as HTMLElement;
        // Fixed to the viewport from lg up; below that the page scrolls.
        expect(rootDiv).toHaveClass('w-full', 'min-h-screen', 'lg:h-screen', 'flex', 'flex-col', 'lg:overflow-hidden');

        // Header sits on the sunken toolbar surface with a hairline below
        const header = screen.getByRole('banner');
        expect(header).toHaveClass('shrink-0', 'w-full', 'bg-surface-secondary', 'border-b', 'border-border-primary');

        // Check content container
        const contentDiv = rootDiv.children[1] as HTMLElement;
        expect(contentDiv).toHaveClass('flex-1', 'flex', 'lg:overflow-hidden', 'min-h-0');
    });

    it('should display version from version.ts as a badge', () => {
        render(<Main workerManager={mockWorkerManager} />);

        expect(screen.getByText(`v${APP_VERSION}`)).toHaveClass('badge');
    });

    it('links the author credit to stid.me', () => {
        render(<Main workerManager={mockWorkerManager} />);

        expect(screen.getByRole('link', { name: 'stid' })).toHaveAttribute('href', 'https://stid.me');
    });

    it('links to the source repository', () => {
        render(<Main workerManager={mockWorkerManager} />);

        expect(screen.getByRole('link', { name: 'github' })).toHaveAttribute(
            'href',
            'https://github.com/stid/Apple1JS',
        );
    });
});
