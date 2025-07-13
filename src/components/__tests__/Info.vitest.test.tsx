import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Info from '../Info';

describe('Info', () => {
    it('renders all info sections', () => {
        render(<Info />);
        expect(screen.getByText(/FIRST START/i)).toBeInTheDocument();
        expect(screen.getByText(/TEST PROGRAM/i)).toBeInTheDocument();
        expect(screen.getByText(/BASIC/i)).toBeInTheDocument();
        expect(screen.getByText(/APPLE 30th ANNIVERSARY/i)).toBeInTheDocument();
        expect(screen.getByText(/LIST MEMORY ADDRESS/i)).toBeInTheDocument();
        expect(screen.getByText(/OPERATION MANUAL/i)).toBeInTheDocument();
        // Use getByRole to specifically check the heading for GITHUB
        expect(screen.getByRole('heading', { name: /GITHUB/i })).toBeInTheDocument();
    });
    it('renders manual and github links', () => {
        render(<Info />);
        expect(screen.getByText(/apple1\.chez\.com/i)).toHaveAttribute('href');
        expect(screen.getByText(/github\.com\/stid\/Apple1JS/i)).toHaveAttribute('href');
    });
});
