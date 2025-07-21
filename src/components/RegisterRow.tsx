import React from 'react';
import { typography, color } from '../styles/utils';
import AddressLink from './AddressLink';
import type { WorkerManager } from '../services/WorkerManager';

interface RegisterRowProps {
  label: string;
  value: string | number;
  type?: 'address' | 'value' | 'flag' | 'status';
  className?: string;
  workerManager?: WorkerManager;
  showAddressLink?: boolean;
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
  className = '',
  workerManager,
  showAddressLink = true
}) => {
  // Parse address value for AddressLink
  const parseAddressValue = (val: string | number): number | null => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      // Handle formats like "$FF00" or "0xFF00"
      const match = val.match(/^[$0x]*([0-9A-Fa-f]+)$/);
      if (match) {
        return parseInt(match[1], 16);
      }
    }
    return null;
  };

  const shouldShowLink = type === 'address' && workerManager && showAddressLink;
  const addressValue = shouldShowLink ? parseAddressValue(value) : null;

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
      {shouldShowLink && addressValue !== null ? (
        <AddressLink
          address={addressValue}
          format="hex4"
          prefix="$"
          workerManager={workerManager}
          showContextMenu={true}
          showRunToCursor={true}
          className="text-xs font-medium"
        />
      ) : (
        <span style={{
          ...typography.xs,
          color: typeColors[type],
          fontWeight: 500,
        }}>
          {value}
        </span>
      )}
    </div>
  );
};

export default RegisterRow;