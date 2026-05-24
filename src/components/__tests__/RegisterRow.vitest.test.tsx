import { describe, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RegisterRow } from '../RegisterRow';
import { createMockWorkerManager } from '../../test-support/mocks/WorkerManager.mock';

// Mock navigation hook so AddressLink can render without a provider
vi.mock('../../contexts/DebuggerNavigationContext', () => ({
    useDebuggerNavigation: () => ({
        navigate: vi.fn(),
    }),
}));

describe('RegisterRow component', () => {
    it('should render label and value correctly', () => {
        render(<RegisterRow label="REG_PC" value="$1234" />);

        expect(screen.getByText('REG_PC:')).toBeInTheDocument();
        expect(screen.getByText('$1234')).toBeInTheDocument();
    });

    it('should apply correct type color classes', () => {
        const { rerender } = render(<RegisterRow label="PC" value="$1234" type="address" />);

        expect(screen.getByText('$1234')).toHaveClass('text-data-address');

        rerender(<RegisterRow label="A" value="$56" type="value" />);
        expect(screen.getByText('$56')).toHaveClass('text-data-value');

        rerender(<RegisterRow label="FLAG_N" value="SET" type="flag" />);
        expect(screen.getByText('SET')).toHaveClass('text-data-flag');

        rerender(<RegisterRow label="STATUS" value="ACTIVE" type="status" />);
        expect(screen.getByText('ACTIVE')).toHaveClass('text-data-status');
    });

    it('should use default value type when no type provided', () => {
        render(<RegisterRow label="X" value="$00" />);

        expect(screen.getByText('$00')).toHaveClass('text-data-value');
    });

    it('should apply custom className', () => {
        render(<RegisterRow label="Test" value="123" className="custom-class" />);

        const container = screen.getByText('Test:').closest('div');
        expect(container).toHaveClass('custom-class');
    });

    it('should handle numeric values', () => {
        render(<RegisterRow label="COUNT" value={42} />);

        expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('should format label with colon', () => {
        render(<RegisterRow label="REG_A" value="$FF" />);

        expect(screen.getByText('REG_A:')).toBeInTheDocument();
        expect(screen.queryByText('REG_A')).not.toBeInTheDocument();
    });

    it('should render a valid address value as an AddressLink', () => {
        const workerManager = createMockWorkerManager();
        render(<RegisterRow label="PC" value="$1234" type="address" workerManager={workerManager} />);

        // AddressLink renders a button with the formatted address
        const link = screen.getByRole('button');
        expect(link).toHaveTextContent('$1234');
    });

    it('should NOT parse a malformed address value as an address', () => {
        const workerManager = createMockWorkerManager();
        render(<RegisterRow label="PC" value="x0$F" type="address" workerManager={workerManager} />);

        // parseAddressValue returns null for the malformed input, so it falls
        // through to a plain span instead of rendering a clickable AddressLink.
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
        expect(screen.getByText('x0$F')).toHaveClass('text-data-address');
    });
});
