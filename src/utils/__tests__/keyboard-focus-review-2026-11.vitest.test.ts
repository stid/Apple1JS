import { describe, it, expect, afterEach } from 'vitest';
import { isTypingInField, EMULATOR_KEYBOARD_ATTR } from '../keyboard-focus';

describe('isTypingInField (review-2026-11)', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    const focus = (el: HTMLElement) => {
        document.body.appendChild(el);
        el.focus();
    };

    it('is false when nothing editable has focus', () => {
        const button = document.createElement('button');
        focus(button);
        expect(isTypingInField()).toBe(false);
    });

    it('is true for a real text input, textarea or select', () => {
        focus(document.createElement('input'));
        expect(isTypingInField()).toBe(true);
        focus(document.createElement('textarea'));
        expect(isTypingInField()).toBe(true);
        focus(document.createElement('select'));
        expect(isTypingInField()).toBe(true);
    });

    it("is false for the emulator's hidden keyboard input", () => {
        // That input holds focus almost all the time; treating it as "typing"
        // disabled the debugger shortcuts (F8/F9, arrows) in normal use.
        const hidden = document.createElement('input');
        hidden.setAttribute(EMULATOR_KEYBOARD_ATTR, '');
        focus(hidden);
        expect(isTypingInField()).toBe(false);
    });
});
