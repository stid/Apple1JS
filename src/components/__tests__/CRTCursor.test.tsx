import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import CRTCursor from '../CRTCursor';

describe('CRTCursor', () => {
    it('renders the cursor at the specified row and column', () => {
        render(<CRTCursor row={3} column={5} />);

        const cursor = screen.getByText('@');
        expect(cursor).toHaveStyle({
            left: '85px', // (5 * 15) + 10
            top: '55px', // (3 * 15) + 10
        });
    });

    it('toggles cursor visibility', async () => {
        jest.useFakeTimers();

        render(<CRTCursor row={0} column={0} />);
        const cursor = screen.getByText('@');

        expect(cursor).toHaveStyle('display: block');

        act(() => {
            jest.advanceTimersByTime(400);
        });

        expect(cursor).toHaveStyle('display: none');

        act(() => {
            jest.advanceTimersByTime(600);
        });

        expect(cursor).toHaveStyle('display: block');

        jest.useRealTimers();
    });
});
