/**
 * Marks the emulator's off-screen keyboard input (AppContent). It keeps focus
 * nearly all the time so keystrokes reach the Apple 1, which means "an INPUT has
 * focus" does not imply the user is typing into a form field.
 */
export const EMULATOR_KEYBOARD_ATTR = 'data-emulator-keyboard';

/**
 * True when focus is in a field the user is editing (address box, memory cell,
 * select), i.e. when view-level keyboard shortcuts should stay out of the way.
 */
export function isTypingInField(): boolean {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) {
        return false;
    }
    if (active.hasAttribute(EMULATOR_KEYBOARD_ATTR)) {
        return false;
    }
    return ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName) || active.isContentEditable === true;
}
