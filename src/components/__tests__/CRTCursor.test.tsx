import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import CRTCursor from '../CRTCursor';

jest.useFakeTimers();

describe('CRTCursor', () => {
    it('should toggle visibility every 400ms when visible and 600ms when not visible', () => {
        const { rerender, queryByTestId } = render(<CRTCursor row={0} column={0} />);

        expect(queryByTestId('cursor')).toBeVisible();

        act(() => {
            jest.advanceTimersByTime(400);
        });

        rerender(<CRTCursor row={0} column={0} />);

        expect(queryByTestId('cursor')).not.toBeVisible();

        act(() => {
            jest.advanceTimersByTime(600);
        });

        rerender(<CRTCursor row={0} column={0} />);

        expect(queryByTestId('cursor')).toBeVisible();
    });
});
