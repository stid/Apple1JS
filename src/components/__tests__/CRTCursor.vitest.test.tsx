import { describe, test, expect } from 'vitest';
import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import CRTCursor from '../CRTCursor';

jest.useFakeTimers();

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
            jest.advanceTimersByTime(530); // UI_TIMINGS.CURSOR_BLINK_RATE
        });
        rerender(<CRTCursor row={0} column={0} />);
        expect(getCursorOpacity()).toBe('0');

        act(() => {
            jest.advanceTimersByTime(530); // UI_TIMINGS.CURSOR_BLINK_RATE
        });
        rerender(<CRTCursor row={0} column={0} />);
        expect(getCursorOpacity()).toBe('1');
    });
});
