import { describe, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import CRTWorker from '../CRTWorker';

describe('CRTWorker', () => {
    it('renders CRT with initial videoData', () => {
        // Mock worker
        const worker = {
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        } as unknown as Worker;
        const { container } = render(<CRTWorker worker={worker} />);
        // CRT should be rendered: look for CRT root div with class 'crt-container'
        const crtDiv = container.querySelector('div.crt-container');
        expect(crtDiv).toBeInTheDocument();
    });
});
