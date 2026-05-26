import { useCallback, useState } from 'react';

/**
 * A `useState`-shaped hook that mirrors its value into `localStorage`, so a preference
 * survives reloads. Reads/writes follow the project's defensive localStorage idiom (see
 * StatePersistenceService): corrupt or unavailable storage never throws — it falls back to
 * `defaultValue`. The value is JSON-serialised under `key`.
 */
export function useLocalStorageState<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
    const [value, setValue] = useState<T>(() => {
        try {
            const stored = window.localStorage.getItem(key);
            return stored !== null ? (JSON.parse(stored) as T) : defaultValue;
        } catch {
            return defaultValue;
        }
    });

    const set = useCallback(
        (next: T | ((prev: T) => T)) => {
            setValue((prev) => {
                const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
                try {
                    window.localStorage.setItem(key, JSON.stringify(resolved));
                } catch {
                    // Storage unavailable (private mode, quota) — keep in-memory state only.
                }
                return resolved;
            });
        },
        [key],
    );

    return [value, set];
}
