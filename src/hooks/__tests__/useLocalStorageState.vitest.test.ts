import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorageState } from '../useLocalStorageState';

const KEY = 'apple1js_ui_test';

// A deterministic in-memory Storage so the test never depends on the (flaky under
// full-suite worker sharing) jsdom localStorage instance.
function makeMemoryStorage(): Storage {
    const map = new Map<string, string>();
    return {
        get length() {
            return map.size;
        },
        clear: () => map.clear(),
        getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
        key: (i: number) => [...map.keys()][i] ?? null,
        removeItem: (k: string) => void map.delete(k),
        setItem: (k: string, v: string) => void map.set(k, String(v)),
    };
}

let originalDescriptor: PropertyDescriptor | undefined;

describe('useLocalStorageState', () => {
    beforeEach(() => {
        originalDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
        Object.defineProperty(window, 'localStorage', {
            value: makeMemoryStorage(),
            configurable: true,
            writable: true,
        });
    });
    afterEach(() => {
        vi.restoreAllMocks();
        if (originalDescriptor) {
            Object.defineProperty(window, 'localStorage', originalDescriptor);
        }
    });

    it('returns the default when nothing is stored', () => {
        const { result } = renderHook(() => useLocalStorageState(KEY, 'overview'));
        expect(result.current[0]).toBe('overview');
    });

    it('hydrates from an existing stored value', () => {
        window.localStorage.setItem(KEY, JSON.stringify('memory'));
        const { result } = renderHook(() => useLocalStorageState(KEY, 'overview'));
        expect(result.current[0]).toBe('memory');
    });

    it('writes through to localStorage on change (value and updater forms)', () => {
        const { result } = renderHook(() => useLocalStorageState(KEY, 0x0000));
        act(() => result.current[1](0x1234));
        expect(result.current[0]).toBe(0x1234);
        expect(JSON.parse(window.localStorage.getItem(KEY)!)).toBe(0x1234);

        act(() => result.current[1]((prev) => prev + 1));
        expect(result.current[0]).toBe(0x1235);
    });

    it('falls back to the default on corrupt JSON without throwing', () => {
        window.localStorage.setItem(KEY, '{not valid json');
        const { result } = renderHook(() => useLocalStorageState(KEY, 'overview'));
        expect(result.current[0]).toBe('overview');
    });

    it('is safe when localStorage access throws', () => {
        vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        const { result } = renderHook(() => useLocalStorageState(KEY, 'info'));
        expect(result.current[0]).toBe('info');
    });

    it('falls back to the default when a valid-JSON value fails the validator', () => {
        // valid JSON, but not an allowed value (e.g. a renamed/hand-edited enum)
        window.localStorage.setItem(KEY, JSON.stringify('settings'));
        const isTab = (v: unknown): v is 'info' | 'debugger' => v === 'info' || v === 'debugger';
        const { result } = renderHook(() => useLocalStorageState(KEY, 'info', isTab));
        expect(result.current[0]).toBe('info');
    });

    it('hydrates a stored value that passes the validator', () => {
        window.localStorage.setItem(KEY, JSON.stringify('debugger'));
        const isTab = (v: unknown): v is 'info' | 'debugger' => v === 'info' || v === 'debugger';
        const { result } = renderHook(() => useLocalStorageState(KEY, 'info', isTab));
        expect(result.current[0]).toBe('debugger');
    });
});
