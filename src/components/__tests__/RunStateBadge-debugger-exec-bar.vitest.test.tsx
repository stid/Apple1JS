/**
 * Phase 4 (SDD) failing tests for spec `debugger-exec-bar`.
 * RunStateBadge: the single, glanceable run-state indicator.
 * Covers AC-1, AC-2, AC-3, AC-10, AC-11.
 */
import { describe, expect, it } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import RunStateBadge from '../RunStateBadge';

describe('RunStateBadge', () => {
    it('AC-1 (RENDER): shows the run-state word plus a non-colour glyph', () => {
        render(<RunStateBadge executionState="running" />);
        const badge = screen.getByRole('status');
        // Word is present (not colour-only) ...
        expect(badge).toHaveTextContent(/RUNNING/i);
        // ... and a non-colour glyph cue accompanies it (decorative, aria-hidden).
        const glyph = badge.querySelector('[aria-hidden="true"]');
        expect(glyph).not.toBeNull();
        expect(glyph?.textContent?.trim().length ?? 0).toBeGreaterThan(0);
    });

    it('AC-2 (RENDER): when paused, additionally shows the halt address', () => {
        render(<RunStateBadge executionState="paused" currentPC={0xff29} />);
        const badge = screen.getByRole('status');
        expect(badge).toHaveTextContent(/PAUSED/i);
        expect(badge).toHaveTextContent(/FF29/i);
    });

    it('AC-3 (RENDER): paused presentation is distinct from the warning/error treatment', () => {
        render(<RunStateBadge executionState="paused" currentPC={0x10} />);
        const badge = screen.getByRole('status');
        const cls = badge.className;
        // Paused is a calm, intentional state — must not reuse warning/error tokens.
        expect(cls).not.toMatch(/warning/);
        expect(cls).not.toMatch(/error/);
        // It uses the informational token instead.
        expect(cls).toMatch(/info/);
    });

    it('AC-10 (RENDER): exposed to assistive tech as a live status region; glyph hidden; state word is the accessible name', () => {
        render(<RunStateBadge executionState="paused" currentPC={0x10} />);
        const badge = screen.getByRole('status');
        expect(badge).toHaveAttribute('aria-live', 'polite');
        // The glyph must be decorative so the readable name is the state word, not a unicode name.
        const glyph = badge.querySelector('[aria-hidden="true"]');
        expect(glyph).not.toBeNull();
        expect(badge).toHaveTextContent(/PAUSED/i);
    });

    it('AC-11: badge content is a pure function of the executionState prop', () => {
        const { rerender } = render(<RunStateBadge executionState="running" />);
        expect(screen.getByRole('status')).toHaveTextContent(/RUNNING/i);
        rerender(<RunStateBadge executionState="paused" currentPC={0x20} />);
        expect(screen.getByRole('status')).toHaveTextContent(/PAUSED/i);
        rerender(<RunStateBadge executionState="stepping" />);
        expect(screen.getByRole('status')).toHaveTextContent(/STEPPING/i);
    });
});
