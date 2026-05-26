import React from 'react';
import { useToast, type ToastVariant } from '../contexts/ToastContext';

// Token-backed per-variant styling (mirrors the RunStateBadge variant-map pattern).
const VARIANT_CLASSES: Record<ToastVariant, string> = {
    success: 'bg-success/20 text-success border-success/40',
    error: 'bg-error/20 text-error border-error/40',
    info: 'bg-info/20 text-info border-info/40',
};

/**
 * Fixed-position, non-blocking stack of active toasts (newest first). Each toast is a
 * polite status region announced to assistive tech; it never traps focus or blocks the
 * rest of the UI. Pure consumer of ToastContext.
 */
const ToastContainer: React.FC = () => {
    const { toasts, dismiss } = useToast();

    if (toasts.length === 0) {
        return null;
    }

    return (
        <div className="fixed bottom-md right-md z-50 flex flex-col gap-sm pointer-events-none">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    role="status"
                    aria-live="polite"
                    data-testid="toast"
                    data-variant={toast.variant}
                    className={`pointer-events-auto flex items-center gap-sm rounded-lg border px-md py-sm text-xs font-mono shadow-lg ${VARIANT_CLASSES[toast.variant]}`}
                >
                    <span className="flex-1">{toast.message}</span>
                    <button
                        type="button"
                        aria-label="Dismiss notification"
                        className="font-bold opacity-70 hover:opacity-100"
                        onClick={() => dismiss(toast.id)}
                    >
                        ×
                    </button>
                </div>
            ))}
        </div>
    );
};

export default ToastContainer;
