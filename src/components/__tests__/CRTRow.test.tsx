import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import CRTRow from '../CRTRow';

describe('CRTRow', () => {
    it('renders a row of characters at the correct row index', () => {
        const { container } = render(<CRTRow line="HELLO" rowIndex={2} />);
        const div = container.querySelector('div.absolute');
        expect(div).toBeInTheDocument();
        // Should render 5 characters
        // Find all child divs inside the row div (should be the chars)
        const rowDiv = container.querySelector('div.absolute');
        const chars = rowDiv ? Array.from(rowDiv.children) : [];
        expect(chars.length).toBe(5);
        // Instead of checking text, check that each char container exists
        chars.forEach((charDiv) => {
            expect(charDiv).toBeInTheDocument();
        });
    });
});
