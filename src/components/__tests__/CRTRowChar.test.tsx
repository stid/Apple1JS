import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import CRTRowChar from '../CRTRowChar';

describe('CRTRowChar', () => {
    it('renders the character at the correct position', () => {
        const { container } = render(<CRTRowChar char="X" x={5} />);
        const div = container.querySelector('div.absolute');
        expect(div).toBeInTheDocument();
        expect(div).toHaveTextContent('X');
        expect((div as HTMLDivElement).style.left).toMatch(/px$/);
    });
});
