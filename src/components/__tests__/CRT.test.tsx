import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import CRT from '../CRT';

describe('CRT', () => {
    it('renders CRT with videoData', () => {
        // VideoData type: { buffer: [ [number, string[]] & { KEY?: string } ][], row: number, column: number }
        const videoData = {
            buffer: [
                [0, ['H', 'E', 'L', 'L', 'O']],
                [1, ['W', 'O', 'R', 'L', 'D']],
            ] as [number, string[]][],
            row: 1,
            column: 2,
        };
        const { container } = render(<CRT videoData={videoData} />);
        const crtDiv = container.querySelector('div.relative.bg-teal-900');
        expect(crtDiv).toBeInTheDocument();
        // Should render CRTCursor and CRTRow components
        expect(container.querySelectorAll('div.absolute').length).toBeGreaterThan(0);
    });
});
