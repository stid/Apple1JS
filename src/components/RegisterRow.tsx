import React from 'react';

interface RegisterRowProps {
  label: string;
  value: string | number;
  type?: 'address' | 'value' | 'flag' | 'status';
  className?: string;
}

const typeColors = {
  address: 'text-data-address',
  value: 'text-data-value',
  flag: 'text-data-flag',
  status: 'text-data-status',
} as const;

export const RegisterRow: React.FC<RegisterRowProps> = ({ 
  label, 
  value, 
  type = 'value',
  className = '' 
}) => {
  return (
    <div className={`flex justify-between items-center py-1 ${className}`}>
      <span className="text-xs text-text-secondary font-medium">
        {label}:
      </span>
      <span className={`text-xs font-mono font-medium ${typeColors[type]}`}>
        {value}
      </span>
    </div>
  );
};

export default RegisterRow;