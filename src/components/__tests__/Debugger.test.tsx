import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import Debugger from '../Debugger';

describe('Debugger', () => {
    it('renders without crashing', () => {
        // Minimal test: just check that the component renders with a mock worker
        const worker = {
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            postMessage: jest.fn(),
        } as unknown as Worker;
        const { container } = render(<Debugger worker={worker} />);
        expect(container.firstChild).toBeInTheDocument();
    });
});
