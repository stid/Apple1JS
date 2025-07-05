import React from 'react';
import { typography, color, styles } from '../styles/utils';

interface MetricCardProps {
  label: string;
  value: string | number;
  status?: 'success' | 'warning' | 'error' | 'info' | 'active' | 'inactive';
  className?: string;
}

const statusColors = {
  success: color('success'),
  warning: color('warning'),
  error: color('error'),
  info: color('info'),
  active: color('success'),
  inactive: color('text.muted'),
} as const;

export const MetricCard: React.FC<MetricCardProps> = ({ 
  label, 
  value, 
  status = 'info',
  className = '' 
}) => {
  return (
    <div 
      className={className}
      style={{
        ...styles.metricCard,
        border: `1px solid ${color('border.primary')}`,
        transition: 'border-color 150ms ease-in-out',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = color('border.secondary');
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = color('border.primary');
      }}
    >
      <div 
        style={{
          ...typography.xs,
          color: color('text.secondary'),
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '0.25rem',
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      <div 
        style={{
          ...typography.sm,
          color: statusColors[status],
          fontWeight: 500,
        }}
      >
        {value}
      </div>
    </div>
  );

};

export default MetricCard;