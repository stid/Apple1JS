import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  status?: 'success' | 'warning' | 'error' | 'info' | 'active' | 'inactive';
  className?: string;
}

const statusColors = {
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
  info: 'text-info',
  active: 'text-success',
  inactive: 'text-text-muted',
} as const;

export const MetricCard: React.FC<MetricCardProps> = ({ 
  label, 
  value, 
  status = 'info',
  className = '' 
}) => {
  return (
    <div className={`bg-black/40 rounded-lg p-3 border border-border-primary transition-colors hover:border-border-secondary ${className}`}>
      <div className="text-xs text-text-secondary uppercase tracking-wide mb-1 font-medium">
        {label}
      </div>
      <div className={`text-sm font-mono font-medium ${statusColors[status]}`}>
        {value}
      </div>
    </div>
  );

};

export default MetricCard;