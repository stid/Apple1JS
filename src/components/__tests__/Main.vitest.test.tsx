import { describe, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import Main from '../Main';
import { IInspectableComponent } from '../../core/types/components';
import { APP_VERSION } from '../../version';

// Mock App component
vi.mock('../App', () => ({
    __esModule: true,
    default: ({ worker, apple1Instance }: { worker: Worker; apple1Instance: IInspectableComponent | null }) => (
        <div data-testid="mocked-app">
            App Component - Worker: {worker ? 'yes' : 'no'}, Instance: {apple1Instance ? 'yes' : 'no'}
        </div>
    ),
}));

// Mock style utilities
vi.mock('../../styles/utils', () => ({
    typography: {
        base: { fontSize: '16px' },
        xs: { fontSize: '12px' }
    },
    color: (path: string) => {
        const colors: Record<string, string> = {
            'background.surface': '#1a1a1a',
            'border.primary': '#333',
            'text.accent': '#68D391',
            'text.secondary': '#999',
            'text.muted': '#666'
        };
        return colors[path] || '#000';
    },
    spacing: (size: string) => {
        const sizes: Record<string, string> = {
            'md': '16px',
            'lg': '24px'
        };
        return sizes[size] || '8px';
    }
}));

describe('Main component', () => {
    let mockWorker: Worker;
    let mockApple1Instance: IInspectableComponent;
    
    beforeEach(() => {
        mockWorker = {} as Worker;
        mockApple1Instance = {
            inspect: vi.fn().mockReturnValue({
                name: 'Apple1',
                state: {},
                metadata: { type: 'system' }
            })
        } as unknown as IInspectableComponent;
    });
    
    it('should render with all required elements', () => {
        render(<Main worker={mockWorker} apple1Instance={mockApple1Instance} />);
        
        // Check header exists
        expect(screen.getByRole('banner')).toBeInTheDocument();
        
        // Check title
        expect(screen.getByText(/Apple 1 :: JS Emulator/)).toBeInTheDocument();
        expect(screen.getByText('- by =stid=')).toBeInTheDocument();
        expect(screen.getByText(`v${APP_VERSION}`)).toBeInTheDocument();
        
        // Check App component is rendered
        expect(screen.getByTestId('mocked-app')).toBeInTheDocument();
        expect(screen.getByText(/App Component/)).toHaveTextContent('App Component - Worker: yes, Instance: yes');
    });
    
    it('should render without apple1Instance', () => {
        render(<Main worker={mockWorker} apple1Instance={null} />);
        
        expect(screen.getByTestId('mocked-app')).toHaveTextContent('App Component - Worker: yes, Instance: no');
    });
    
    it('should have correct layout structure', () => {
        const { container } = render(<Main worker={mockWorker} apple1Instance={mockApple1Instance} />);
        
        // Check root div has correct styles
        const rootDiv = container.firstChild as HTMLElement;
        expect(rootDiv).toHaveStyle({
            width: '100%',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        });
        
        // Check header styles
        const header = screen.getByRole('banner');
        expect(header).toHaveStyle({
            flexShrink: '0',
            width: '100%',
            backgroundColor: '#1a1a1a',
            borderBottom: '1px solid #333'
        });
        
        // Check content container
        const contentDiv = rootDiv.children[1] as HTMLElement;
        expect(contentDiv).toHaveStyle({
            flex: '1',
            display: 'flex',
            overflow: 'hidden',
            minHeight: '0'
        });
    });
    
    it('should pass correct props to App component', () => {
        const { rerender } = render(<Main worker={mockWorker} apple1Instance={mockApple1Instance} />);
        
        // Initial render with instance
        expect(screen.getByTestId('mocked-app')).toHaveTextContent('Worker: yes, Instance: yes');
        
        // Rerender without instance
        rerender(<Main worker={mockWorker} apple1Instance={null} />);
        expect(screen.getByTestId('mocked-app')).toHaveTextContent('Worker: yes, Instance: no');
    });
    
    it('should display version from version.ts', () => {
        render(<Main worker={mockWorker} apple1Instance={mockApple1Instance} />);
        
        const versionElement = screen.getByText(`v${APP_VERSION}`);
        expect(versionElement).toBeInTheDocument();
        expect(versionElement).toHaveStyle({
            fontSize: '12px',
            color: '#666'
        });
    });
    
    it('should have proper title structure with different text styles', () => {
        render(<Main worker={mockWorker} apple1Instance={mockApple1Instance} />);
        
        const titleElement = screen.getByRole('heading', { level: 1 });
        expect(titleElement).toHaveStyle({
            fontSize: '16px',
            color: '#68D391',
            fontWeight: '500',
            letterSpacing: '0.025em'
        });
        
        const authorElement = screen.getByText('- by =stid=');
        expect(authorElement).toHaveStyle({
            color: '#999',
            fontWeight: '400'
        });
    });
});