import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MetricCard } from '../MetricCard';

describe('MetricCard component', () => {
    it('should render label and value correctly', () => {
        render(<MetricCard label="Instructions" value="4,297,966" />);
        
        expect(screen.getByText('Instructions')).toBeInTheDocument();
        expect(screen.getByText('4,297,966')).toBeInTheDocument();
    });

    it('should apply correct status color classes', () => {
        const { rerender } = render(
            <MetricCard label="Status" value="ACTIVE" status="success" />
        );
        
        expect(screen.getByText('ACTIVE')).toHaveClass('text-success');
        
        rerender(<MetricCard label="Status" value="ERROR" status="error" />);
        expect(screen.getByText('ERROR')).toHaveClass('text-error');
        
        rerender(<MetricCard label="Status" value="WARNING" status="warning" />);
        expect(screen.getByText('WARNING')).toHaveClass('text-warning');
    });

    it('should use default info status when no status provided', () => {
        render(<MetricCard label="Count" value="100" />);
        
        expect(screen.getByText('100')).toHaveClass('text-info');
    });

    it('should apply custom className', () => {
        render(<MetricCard label="Test" value="123" className="custom-class" />);
        
        const container = screen.getByText('123').closest('div')?.parentElement;
        expect(container).toHaveClass('custom-class');
    });

    it('should handle numeric values', () => {
        render(<MetricCard label="Count" value={42} />);
        
        expect(screen.getByText('42')).toBeInTheDocument();
    });
});