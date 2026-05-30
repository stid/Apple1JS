import React from 'react';
import { Formatters } from '../utils/formatters';
import type { ExecutionState } from '../contexts/EmulationContext';

interface RunStateBadgeProps {
    /** The single source-of-truth run state. */
    executionState: ExecutionState;
    /** Program counter, shown as the halt address while paused. */
    currentPC?: number;
    className?: string;
}

/**
 * The one glanceable run-state indicator. State is conveyed by THREE redundant
 * channels — a word, a non-colour glyph, and colour — so it is never colour-only
 * (AC-1/AC-10). Paused uses the informational token, deliberately distinct from the
 * warning/error treatment, because a breakpoint pause is intentional, not a fault
 * (AC-3). Content is a pure function of the props (AC-11).
 */
const PRESENTATION: Record<ExecutionState, { label: string; glyph: string; classes: string }> = {
    running: { label: 'RUNNING', glyph: '▶', classes: 'bg-success/20 text-success' },
    paused: { label: 'PAUSED', glyph: '⏸', classes: 'bg-info/20 text-info' },
    stepping: { label: 'STEPPING', glyph: '⇥', classes: 'bg-data-value/20 text-data-value' },
};

const RunStateBadge: React.FC<RunStateBadgeProps> = ({ executionState, currentPC, className = '' }) => {
    const { label, glyph, classes } = PRESENTATION[executionState];
    const showAddress = executionState === 'paused' && currentPC !== undefined;
    const address = showAddress ? Formatters.address(currentPC as number) : '';

    return (
        <span
            role="status"
            aria-live="polite"
            aria-label={showAddress ? `${label} at ${address}` : label}
            className={`inline-flex items-center gap-xs text-xs font-medium px-sm py-xxs rounded-sm ${classes} ${className}`}
        >
            <span aria-hidden="true">{glyph}</span>
            <span>{label}</span>
            {showAddress && <span className="font-mono">{address}</span>}
        </span>
    );
};

export default RunStateBadge;
