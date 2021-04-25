require('@testing-library/jest-dom/extend-expect');
import CRTCursor from '../CRTCursor';
import { render, screen, act, waitFor } from '@testing-library/react';

describe('CRTCursor', function () {
    beforeEach(function () {
        jest.useFakeTimers();
    });

    afterEach(function () {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    test('Render CRTCursor component', function () {
        render(<CRTCursor row={10} column={20} />);
        const element = screen.getByText('@');
        expect(element).toBeInTheDocument();
    });

    test('Blink CRTCursor component', async function () {
        act(() => {
            render(<CRTCursor row={10} column={20} />);
        });
        expect(screen.getByText('@').style.display).toBe('block');

        // Blink Off
        act(() => {
            jest.advanceTimersByTime(401);
        });

        await waitFor(() => {
            expect(screen.getByText('@').style.display).toBe('none');
        });

        // Blink On
        act(() => {
            jest.advanceTimersByTime(601);
        });
        await waitFor(() => {
            expect(screen.getByText('@').style.display).toBe('block');
        });
    });
});
