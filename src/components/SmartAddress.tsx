import React from 'react';
import AddressLink from './AddressLink';
import { Formatters } from '../utils/formatters';
import type { WorkerManager } from '../services/WorkerManager';

interface SmartAddressProps {
  value: string | number;
  workerManager?: WorkerManager;
  className?: string;
  showContextMenu?: boolean;
  showRunToCursor?: boolean;
}

/**
 * SmartAddress - Automatically detects and renders simple addresses with proper linking
 * 
 * Supports simple single address formats only:
 * - $XXXX or $XX
 * - 0xXXXX or 0xXX  
 */
export const SmartAddress: React.FC<SmartAddressProps> = ({ 
  value, 
  workerManager,
  className = '',
  showContextMenu = true,
  showRunToCursor = true
}) => {
  // Convert to string for processing
  const text = typeof value === 'number' 
    ? Formatters.address(value)
    : String(value);

  // Only handle simple single address formats
  const simpleAddressMatch = text.match(/^\s*(\$|0x)([0-9A-Fa-f]{2,4})\s*$/);
  
  if (simpleAddressMatch && workerManager) {
    const prefix = simpleAddressMatch[1];
    const hexValue = simpleAddressMatch[2];
    const address = parseInt(hexValue, 16);
    
    return (
      <AddressLink
        address={address}
        format={hexValue.length === 2 ? 'hex2' : 'hex4'}
        prefix={prefix}
        workerManager={workerManager}
        showContextMenu={showContextMenu}
        showRunToCursor={showRunToCursor}
        className={className}
      />
    );
  }

  // For anything else, just return as plain text
  return <span className={className}>{text}</span>;
};

export default SmartAddress;