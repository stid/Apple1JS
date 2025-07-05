import React from 'react';
import { typography, color } from '../styles/utils';

interface RegisterRowProps {
  label: string;
  value: string | number;
  type?: 'address' | 'value' | 'flag' | 'status';
  className?: string;
}

const typeColors = {
  address: color('address'),
  value: color('value'),
  flag: color('flag'),
  status: color('status'),
} as const;

export const RegisterRow: React.FC<RegisterRowProps> = ({ 
  label, 
  value, 
  type = 'value',
  className = '' 
}) => {
  return (
    <div 
      className={className}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.25rem 0',
      }}
    >
      <span style={{
        ...typography.xs,
        color: color('text.secondary'),
        fontWeight: 500,
      }}>
        {label}:
      </span>
      <span style={{
        ...typography.xs,
        color: typeColors[type],
        fontWeight: 500,
      }}>
        {value}
      </span>
    </div>
  );
};

export default RegisterRow;