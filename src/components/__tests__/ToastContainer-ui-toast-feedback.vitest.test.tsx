import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, act, within } from '@testing-library/react';
// These imports do not exist yet — that is what makes these tests red (Phase 4).
import ToastContainer from '../ToastContainer';
import { ToastProvider, useToast } from '../../contexts/ToastContext';

afterEach(() => vi.clearAllMocks());

/** Harness: a control surface to push toasts plus the container under test. */
const Harness: React.FC<{ siblingOnClick?: () => void }> = ({ siblingOnClick }) => {
    const { showToast } = useToast();
    return (
        <div>
            <button onClick={() => showToast('first', 'info')}>push-first</button>
            <button onClick={() => showToast('second', 'success')}>push-second</button>
            {siblingOnClick && <button onClick={siblingOnClick}>sibling</button>}
            <ToastContainer />
        </div>
    );
};

describe('ToastContainer', () => {
    // AC-8 (RENDER): multiple messages are all visible at once, ordered newest-first, and
    // each is independently dismissable.
    it('AC-8 (RENDER): stacks toasts newest-first and dismisses each independently', () => {
        render(
            <ToastProvider>
                <Harness />
            </ToastProvider>,
        );

        act(() => screen.getByText('push-first').click());
        act(() => screen.getByText('push-second').click());

        const toasts = screen.getAllByTestId('toast');
        expect(toasts).toHaveLength(2);
        // newest-first: the most recently pushed ("second") renders first
        expect(within(toasts[0]).getByText('second')).toBeInTheDocument();
        expect(within(toasts[1]).getByText('first')).toBeInTheDocument();

        // dismissing the newest leaves the other intact
        act(() =>
            within(toasts[0])
                .getByRole('button', { name: /dismiss/i })
                .click(),
        );
        expect(screen.queryByText('second')).not.toBeInTheDocument();
        expect(screen.getByText('first')).toBeInTheDocument();
    });

    // AC-9 (RENDER): each message is exposed to assistive tech via a polite status
    // announcement and does not block interaction with the rest of the interface.
    it('AC-9 (RENDER): toasts are polite status regions and do not block other interaction', () => {
        const siblingOnClick = vi.fn();
        render(
            <ToastProvider>
                <Harness siblingOnClick={siblingOnClick} />
            </ToastProvider>,
        );

        act(() => screen.getByText('push-first').click());

        const toast = screen.getByTestId('toast');
        expect(toast).toHaveAttribute('role', 'status');
        expect(toast).toHaveAttribute('aria-live', 'polite');
        // non-blocking: it is not a modal dialog…
        expect(toast).not.toHaveAttribute('aria-modal', 'true');
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
        // …and the rest of the UI stays interactive while the toast is shown
        act(() => screen.getByText('sibling').click());
        expect(siblingOnClick).toHaveBeenCalledTimes(1);
    });
});
