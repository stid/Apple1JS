import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import CRTWorker from '../CRTWorker';

describe('CRTWorker', () => {
    it('renders CRT with initial videoData', () => {
        // Mock worker
        const worker = {
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
        } as unknown as Worker;
        const { container } = render(<CRTWorker worker={worker} />);
        // CRT should be rendered: look for CRT root div with class 'relative bg-teal-900'
        const crtDiv = container.querySelector('div.relative.bg-teal-900');
        expect(crtDiv).toBeInTheDocument();
    });
});
