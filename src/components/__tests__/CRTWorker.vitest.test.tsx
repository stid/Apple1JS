import { describe, expect } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import CRTWorker from '../CRTWorker';
import { createMockWorkerManager } from '../../test-support/mocks/WorkerManager.mock';

describe('CRTWorker', () => {
    it('renders CRT with initial videoData', () => {
        // Mock WorkerManager
        const mockWorkerManager = createMockWorkerManager();
        const { container } = render(<CRTWorker workerManager={mockWorkerManager} />);
        // CRT should be rendered: look for CRT root div with class 'crt-container'
        const crtDiv = container.querySelector('div.crt-container');
        expect(crtDiv).toBeInTheDocument();
    });
});
