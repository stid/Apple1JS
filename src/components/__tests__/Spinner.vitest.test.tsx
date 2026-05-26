import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import Spinner from '../Spinner';

describe('Spinner', () => {
    it('renders an accessible, animated busy indicator', () => {
        render(<Spinner label="Switching…" />);
        const spinner = screen.getByTestId('spinner');
        // announced to assistive tech as busy
        expect(spinner).toHaveAttribute('role', 'status');
        expect(spinner).toHaveAttribute('aria-label', 'Switching…');
        // visually animated (Tailwind's spin utility)
        expect(spinner.querySelector('.animate-spin')).not.toBeNull();
    });

    it('defaults its accessible label when none is given', () => {
        render(<Spinner />);
        expect(screen.getByTestId('spinner')).toHaveAttribute('aria-label', 'Loading');
    });
});
