import React from 'react';

interface MetricCardProps {
    label: string;
    value: string | number;
    status?: 'success' | 'warning' | 'error' | 'info' | 'active' | 'inactive';
    className?: string;
}

// Static literal class names so Tailwind's content scanner keeps them.
const statusColorClass = {
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error',
    info: 'text-info',
    active: 'text-success',
    inactive: 'text-text-muted',
} as const;

export const MetricCard: React.FC<MetricCardProps> = ({ label, value, status = 'info', className = '' }) => {
    return (
        <div
            className={`bg-surface-overlay rounded-lg p-3 border border-border-primary hover:border-border-secondary transition-colors duration-150 ${className}`}
        >
            <div className="text-xs font-mono font-medium text-text-secondary uppercase tracking-wider mb-1">
                {label}
            </div>
            <div className={`text-sm font-mono font-medium ${statusColorClass[status]}`}>{value}</div>
        </div>
    );
};

export default MetricCard;
