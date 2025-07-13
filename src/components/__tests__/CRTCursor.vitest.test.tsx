import { describe, expect , vi} from 'vitest';
import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import CRTCursor from '../CRTCursor';

vi.useFakeTimers();

describe('CRTCursor', () => {
    it('should toggle visibility with the blink interval', () => {
        const { rerender, queryByTestId } = render(<CRTCursor row={0} column={0} />);

        const getCursorOpacity = () => {
            const el = queryByTestId('cursor');
            if (!el) return null;
            return window.getComputedStyle(el).opacity;
        };

        expect(getCursorOpacity()).toBe('1');

        act(() => {
            vi.advanceTimersByTime(530); // UI_TIMINGS.CURSOR_BLINK_RATE
        });
        rerender(<CRTCursor row={0} column={0} />);
        expect(getCursorOpacity()).toBe('0');

        act(() => {
            vi.advanceTimersByTime(530); // UI_TIMINGS.CURSOR_BLINK_RATE
        });
        rerender(<CRTCursor row={0} column={0} />);
        expect(getCursorOpacity()).toBe('1');
    });
});
