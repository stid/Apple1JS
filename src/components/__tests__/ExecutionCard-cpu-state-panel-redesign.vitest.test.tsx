import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ExecutionCard from '../ExecutionCard';
import type { FilteredDebugData, CPUDebugData } from '../../apple1/types/worker-messages';

const makeDebug = (cpu: CPUDebugData): FilteredDebugData => ({ cpu, pia: {}, Bus: {}, clock: {} });

const renderCard = (cpu: CPUDebugData) => render(<ExecutionCard debugInfo={makeDebug(cpu)} />);

describe('ExecutionCard (cpu-state-panel-redesign)', () => {
    it('renders the title and the four execution rows with values', () => {
        renderCard({ HW_OPCODE: '$38', PERF_INSTRUCTIONS: '14,056', IRQ_LINE: 'INACTIVE', NMI_LINE: 'INACTIVE' });

        expect(screen.getByText('Execution')).toBeInTheDocument();
        expect(screen.getByText('Last Opcode')).toBeInTheDocument();
        expect(screen.getByText('Instructions')).toBeInTheDocument();
        expect(screen.getByText('IRQ Line')).toBeInTheDocument();
        expect(screen.getByText('NMI Line')).toBeInTheDocument();
        // Values are emphasized (semibold) so they carry the visual hierarchy, matching the mockup.
        expect(screen.getByText('$38')).toHaveClass('text-data-value', 'font-semibold');
        expect(screen.getByText('14,056')).toHaveClass('text-data-status', 'font-semibold');
    });

    it('highlights an ACTIVE interrupt line with the warning token', () => {
        renderCard({ IRQ_LINE: 'ACTIVE', NMI_LINE: 'INACTIVE' });
        expect(screen.getByText('ACTIVE')).toHaveClass('text-warning');
        expect(screen.getByText('INACTIVE')).toHaveClass('text-text-secondary');
    });
});
