import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CpuStateCard from '../CpuStateCard';
import { DebuggerNavigationProvider } from '../../contexts/DebuggerNavigationContext';
import type { FilteredDebugData, CPUDebugData } from '../../apple1/types/worker-messages';

// Build a minimal FilteredDebugData with the given cpu fields; the card only reads `.cpu`.
const makeDebug = (cpu: CPUDebugData): FilteredDebugData => ({ cpu, pia: {}, Bus: {}, clock: {} });

const renderCard = (cpu: CPUDebugData) =>
    render(
        <DebuggerNavigationProvider>
            <CpuStateCard debugInfo={makeDebug(cpu)} />
        </DebuggerNavigationProvider>,
    );

describe('CpuStateCard (cpu-state-panel-redesign)', () => {
    it('renders the title and the A/X/Y/SP register rail with values', () => {
        renderCard({ REG_A: '$85', REG_X: '$F2', REG_Y: '$B6', REG_S: '$AD', REG_PC: '$CC40' });

        expect(screen.getByText('CPU State')).toBeInTheDocument();
        // Rail labels
        ['A', 'X', 'Y', 'SP'].forEach((label) => expect(screen.getByText(label)).toBeInTheDocument());
        // Rail values
        ['$85', '$F2', '$B6', '$AD'].forEach((v) => expect(screen.getByText(v)).toBeInTheDocument());
    });

    it('renders the PC as a clickable AddressLink button when REG_PC is present', () => {
        renderCard({ REG_PC: '$CC40' });
        const pc = screen.getByText('$CC40');
        // AddressLink renders a <button>
        expect(pc.closest('button')).not.toBeNull();
    });

    it('emphasizes SET flags with the success token and dims clear flags', () => {
        renderCard({ FLAG_N: 'SET', FLAG_V: 'CLR', FLAG_Z: 'SET', FLAG_C: 'CLR' });

        expect(screen.getByText('FLAGS')).toBeInTheDocument();
        expect(screen.getByText('N')).toHaveClass('text-success'); // set
        expect(screen.getByText('Z')).toHaveClass('text-success'); // set
        expect(screen.getByText('V')).toHaveClass('text-text-secondary'); // clear
        expect(screen.getByText('C')).toHaveClass('text-text-secondary'); // clear
    });

    it('renders the unused -/B placeholders with the disabled token (never highlighted)', () => {
        renderCard({ FLAG_N: 'SET' });
        expect(screen.getByText('B')).toHaveClass('text-text-disabled');
        expect(screen.getByText('-')).toHaveClass('text-text-disabled');
    });

    it('renders the cycle counter with the status (purple) token', () => {
        renderCard({ HW_CYCLES: '129,554,096' });
        const cycles = screen.getByText('129,554,096');
        expect(cycles).toHaveClass('text-data-status');
    });
});
