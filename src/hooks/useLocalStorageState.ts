import { useCallback, useState } from 'react';

/**
 * A `useState`-shaped hook that mirrors its value into `localStorage`, so a preference
 * survives reloads. Reads/writes follow the project's defensive localStorage idiom (see
 * StatePersistenceService): corrupt or unavailable storage never throws — it falls back to
 * `defaultValue`. The value is JSON-serialised under `key`.
 *
 * Pass `isValid` (a type guard) to reject stored values that are valid JSON but not valid
 * app state — e.g. a renamed enum or a hand-edited entry — so a stale/bad value degrades to
 * `defaultValue` instead of putting the UI into an impossible state.
 */
export function useLocalStorageState<T>(
    key: string,
    defaultValue: T,
    isValid?: (value: unknown) => value is T,
): [T, (value: T | ((prev: T) => T)) => void] {
    const [value, setValue] = useState<T>(() => {
        try {
            const stored = window.localStorage.getItem(key);
            if (stored === null) {
                return defaultValue;
            }
            const parsed: unknown = JSON.parse(stored);
            return isValid && !isValid(parsed) ? defaultValue : (parsed as T);
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
