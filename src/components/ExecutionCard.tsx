import React, { memo } from 'react';
import { getDebugValueOrDefault } from '../utils/debug-helpers';
import type { FilteredDebugData } from '../apple1/types/worker-messages';

interface ExecutionCardProps {
    debugInfo: FilteredDebugData;
}

const InterruptRow: React.FC<{ label: string; active: boolean }> = ({ label, active }) => (
    <div className="flex items-center justify-between py-sm">
        <span className="text-sm text-text-secondary">{label}</span>
        <span className="flex items-center gap-xs">
            <span
                className={`inline-block w-2 h-2 rounded-full ${
                    active ? 'bg-warning' : 'border border-text-secondary'
                }`}
            />
            <span className={`font-mono text-sm ${active ? 'text-warning' : 'text-text-secondary'}`}>
                {active ? 'ACTIVE' : 'INACTIVE'}
            </span>
        </span>
    </div>
);

const ExecutionCardComponent: React.FC<ExecutionCardProps> = ({ debugInfo }) => {
    const cpu = debugInfo.cpu;

    return (
        <div className="bg-surface-primary rounded-lg p-md border border-border-primary">
            <h3 className="text-sm font-medium text-text-accent mb-sm">Execution</h3>
            <div className="divide-y divide-border-subtle">
                <div className="flex items-center justify-between py-sm">
                    <span className="text-sm text-text-secondary">Last Opcode</span>
                    <span className="font-mono text-sm text-data-value">
                        {getDebugValueOrDefault(cpu?.HW_OPCODE, '$00')}
                    </span>
                </div>
                <div className="flex items-center justify-between py-sm">
                    <span className="text-sm text-text-secondary">Instructions</span>
                    <span className="font-mono text-sm text-data-status">
                        {getDebugValueOrDefault(cpu?.PERF_INSTRUCTIONS, '0')}
                    </span>
                </div>
                <InterruptRow label="IRQ Line" active={cpu?.IRQ_LINE === 'ACTIVE'} />
                <InterruptRow label="NMI Line" active={cpu?.NMI_LINE === 'ACTIVE'} />
            </div>
        </div>
    );
};

const ExecutionCard = memo(ExecutionCardComponent);

export default ExecutionCard;
