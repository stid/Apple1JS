import React from 'react';
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

// Static literal class names so Tailwind's content scanner keeps them.
const typeColorClass = {
    address: 'text-data-address',
    value: 'text-data-value',
    flag: 'text-data-flag',
    status: 'text-data-status',
} as const;

export const RegisterRow: React.FC<RegisterRowProps> = ({
    label,
    value,
    type = 'value',
    className = '',
    workerManager,
    showAddressLink = true,
}) => {
    // Parse address value for AddressLink
    const parseAddressValue = (val: string | number): number | null => {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
            // Handle formats like "$FF00" or "0xFF00"
            const match = val.match(/^(?:\$|0x)?([0-9A-Fa-f]+)$/i);
            if (match) {
                return parseInt(match[1], 16);
            }
        }
        return null;
    };

    const shouldShowLink = type === 'address' && workerManager && showAddressLink;
    const addressValue = shouldShowLink ? parseAddressValue(value) : null;

    return (
        <div className={`flex justify-between items-center py-xs ${className}`}>
            <span className="text-xs font-mono font-medium text-text-secondary">{label}:</span>
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
                <span className={`text-xs font-mono font-medium ${typeColorClass[type]}`}>{value}</span>
            )}
        </div>
    );
};

export default RegisterRow;
