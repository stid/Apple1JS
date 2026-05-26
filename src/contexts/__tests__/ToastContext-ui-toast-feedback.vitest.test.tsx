import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, renderHook, act, screen } from '@testing-library/react';
// These imports do not exist yet — that is what makes these tests red (Phase 4).
import { ToastProvider, useToast } from '../ToastContext';

const wrapper = ({ children }: { children: React.ReactNode }) => <ToastProvider>{children}</ToastProvider>;

describe('ToastContext', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    // AC-10 (none): the notification store enqueues newest-first, auto-removes non-error
    // entries after the configured duration, removes any entry on dismiss, and keeps error
    // entries until dismissed.
    it('AC-10 (none): store enqueues newest-first, auto-expires non-errors, persists errors, dismisses on request', () => {
        const { result } = renderHook(() => useToast(), { wrapper });

        // enqueue prepends newest-first
        act(() => {
            result.current.showToast('first', 'info');
            result.current.showToast('second', 'info');
        });
        expect(result.current.toasts).toHaveLength(2);
        expect(result.current.toasts[0].message).toBe('second');

        // non-error entries auto-expire after the configured duration
        act(() => {
            vi.advanceTimersByTime(10_000);
        });
        expect(result.current.toasts).toHaveLength(0);

        // error entries persist past the duration
        act(() => {
            result.current.showToast('boom', 'error');
        });
        act(() => {
            vi.advanceTimersByTime(10_000);
        });
        expect(result.current.toasts).toHaveLength(1);
        expect(result.current.toasts[0].variant).toBe('error');

        // any entry is removed on explicit dismiss
        const id = result.current.toasts[0].id;
        act(() => {
            result.current.dismiss(id);
        });
        expect(result.current.toasts).toHaveLength(0);
    });

    // AC-10 (none): the hook refuses to operate outside its provider.
    it('AC-10 (none): useToast throws when used outside a ToastProvider', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => renderHook(() => useToast())).toThrow();
        spy.mockRestore();
    });

    // AC-7 (RENDER): a success/info message disappears on its own after a bounded time,
    // while an error message remains until the user dismisses it.
    it('AC-7 (RENDER): success/info auto-dismisses on screen, error remains', () => {
        const Consumer: React.FC = () => {
            const { toasts, showToast } = useToast();
            return (
                <div>
                    <button onClick={() => showToast('saved ok', 'success')}>fire-success</button>
                    <button onClick={() => showToast('save failed', 'error')}>fire-error</button>
                    <ul>
                        {toasts.map((t) => (
                            <li key={t.id}>{t.message}</li>
                        ))}
                    </ul>
                </div>
            );
        };
        render(<Consumer />, { wrapper });

        act(() => {
            screen.getByText('fire-success').click();
        });
        expect(screen.getByText('saved ok')).toBeInTheDocument();
        act(() => {
            vi.advanceTimersByTime(10_000);
        });
        expect(screen.queryByText('saved ok')).not.toBeInTheDocument();

        act(() => {
            screen.getByText('fire-error').click();
        });
        act(() => {
            vi.advanceTimersByTime(10_000);
        });
        expect(screen.getByText('save failed')).toBeInTheDocument();
    });
});
