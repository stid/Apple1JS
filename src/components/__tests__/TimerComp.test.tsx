/**
 * @jest-environment jsdom
 */

require('@testing-library/jest-dom/extend-expect');
import TimerComp from '../TimerComp';
import { render, screen, act } from '@testing-library/react';

describe('TimerComp', function () {
    beforeEach(function () {
        jest.useFakeTimers('modern');
    });

    afterEach(function () {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    test.skip('Render TimerComp component', function () {
        render(<TimerComp />);
        const element = screen.getByText('ABC');
        expect(element).toBeInTheDocument();
        expect(element).toMatchInlineSnapshot(`
            <div
              style="display: block;"
            >
              ABC
            </div>
        `);
    });

    test('Blinking TimerComp', async function () {
        act(() => {
            render(<TimerComp />);
        });
        const element = screen.getByText('ABC');
        expect(element.style.display).toBe('block');

        // Blink Off
        await act(async () => {
            jest.advanceTimersByTime(1001);
        });

        expect(screen.getByText('ABC').style.display).toBe('none');

        // Blink On
        await act(async () => {
            jest.advanceTimersByTime(1001);
        });
        expect(screen.getByText('ABC').style.display).toBe('block');
    });
});
