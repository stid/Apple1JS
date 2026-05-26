import React, { createContext, useContext, useState, useCallback } from 'react';
import { UI_TIMINGS } from '../constants/ui';
import { useUnmountSafe } from '../hooks/useUnmountSafe';

export type ToastVariant = 'success' | 'error' | 'info';

export interface Toast {
    id: string;
    message: string;
    variant: ToastVariant;
}

interface ToastContextValue {
    /** Active toasts, newest first. */
    toasts: Toast[];
    /** Enqueue a toast. Non-error variants auto-dismiss; errors persist until dismissed. */
    showToast: (message: string, variant?: ToastVariant) => void;
    /** Remove a toast by id. */
    dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let nextToastId = 0;

export const useToast = (): ToastContextValue => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

interface ToastProviderProps {
    children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const { safeSetTimeout } = useUnmountSafe();

    const dismiss = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const showToast = useCallback(
        (message: string, variant: ToastVariant = 'info') => {
            const id = `toast-${nextToastId++}`;
            // newest-first
            setToasts((prev) => [{ id, message, variant }, ...prev]);
            // Success/info clear themselves; errors stay until the user dismisses them.
            if (variant !== 'error') {
                safeSetTimeout(() => dismiss(id), UI_TIMINGS.TOAST_DURATION);
            }
        },
        [safeSetTimeout, dismiss],
    );

    return <ToastContext.Provider value={{ toasts, showToast, dismiss }}>{children}</ToastContext.Provider>;
};
