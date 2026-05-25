/**
 * Phase 4 (SDD) failing test for spec `debugger-exec-bar`.
 * AC-9: the machine/settings controls beside the display no longer include
 * run / pause / reset (or the engine switch) — those live only in the bar.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import Actions from '../Actions';

// Typed directly against the real ActionsProps so this test fails to compile if
// execution/engine props ever leak back in (no double-cast to mask drift).
const props: React.ComponentProps<typeof Actions> = {
    onBS: vi.fn(),
    supportBS: true,
    onSaveState: vi.fn(),
    onLoadState: vi.fn(),
    onRefocus: vi.fn(),
    onCycleAccurateTiming: vi.fn(),
    cycleAccurateTiming: true,
};

describe('Actions (left settings panel)', () => {
    it('AC-9 (RENDER): renders no run / pause / reset / engine controls', () => {
        render(<Actions {...props} />);

        // Settings controls are retained ...
        expect(screen.getByText(/SAVE STATE/i)).toBeInTheDocument();

        // ... but execution + engine controls are gone (they live only in the bar).
        expect(screen.queryByText(/^RESET$/i)).toBeNull();
        expect(screen.queryByText(/PAUSE|RESUME/i)).toBeNull();
        expect(screen.queryByText(/ENGINE/i)).toBeNull();
    });
});
