/**
 * @jest-environment jsdom
 */

require('@testing-library/jest-dom/extend-expect');
import CRTCursor from '../CRTCursor';
import { render, screen, act, waitFor } from '@testing-library/react';

describe('CRTCursor', function () {
    beforeEach(function () {
        jest.useFakeTimers('modern');
    });

    afterEach(function () {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    test('Render CRTCursor component', function () {
        render(<CRTCursor row={10} column={20} />);
        const element = screen.getByText('@');
        expect(element).toBeInTheDocument();
        expect(element).toMatchInlineSnapshot(`
            <div
              class="c-emBIds"
              style="left: 310px; top: 160px; display: block;"
            >
              @
            </div>
        `);
    });

    test('Blinking CRTCursor', async function () {
        act(() => {
            render(<CRTCursor row={10} column={20} />);
        });
        const element = screen.getByText('@');
        expect(element.style.display).toBe('block');

        // Blink Off
        act(() => {
            jest.advanceTimersByTime(401);
        });

        expect(screen.getByText('@')).toMatchInlineSnapshot(`
            <div
              class="c-emBIds"
              style="left: 310px; top: 160px; display: block;"
            >
              @
            </div>
        `);

        // Blink On
        act(() => {
            jest.advanceTimersByTime(601);
        });
        await waitFor(() => {
            expect(screen.getByText('@').style.display).toBe('block');
        });
    });
});
