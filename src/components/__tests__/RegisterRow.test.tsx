import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RegisterRow } from '../RegisterRow';

describe('RegisterRow component', () => {
    it('should render label and value correctly', () => {
        render(<RegisterRow label="REG_PC" value="$1234" />);
        
        expect(screen.getByText('REG_PC:')).toBeInTheDocument();
        expect(screen.getByText('$1234')).toBeInTheDocument();
    });

    it('should apply correct type color styles', () => {
        const { rerender } = render(
            <RegisterRow label="PC" value="$1234" type="address" />
        );
        
        expect(screen.getByText('$1234')).toHaveStyle('color: #34D399');
        
        rerender(<RegisterRow label="A" value="$56" type="value" />);
        expect(screen.getByText('$56')).toHaveStyle('color: #34D399');
        
        rerender(<RegisterRow label="FLAG_N" value="SET" type="flag" />);
        expect(screen.getByText('SET')).toHaveStyle('color: #F59E0B');
        
        rerender(<RegisterRow label="STATUS" value="ACTIVE" type="status" />);
        expect(screen.getByText('ACTIVE')).toHaveStyle('color: #8B5CF6');
    });

    it('should use default value type when no type provided', () => {
        render(<RegisterRow label="X" value="$00" />);
        
        expect(screen.getByText('$00')).toHaveStyle('color: #34D399');
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
});