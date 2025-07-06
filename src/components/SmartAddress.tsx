import React from 'react';
import AddressLink from './AddressLink';

interface SmartAddressProps {
  value: string | number;
  worker?: Worker;
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
  worker,
  className = '',
  showContextMenu = true,
  showRunToCursor = true
}) => {
  // Convert to string for processing
  const text = typeof value === 'number' 
    ? `$${value.toString(16).padStart(4, '0').toUpperCase()}`
    : String(value);

  // Only handle simple single address formats
  const simpleAddressMatch = text.match(/^\s*(\$|0x)([0-9A-Fa-f]{2,4})\s*$/);
  
  if (simpleAddressMatch && worker) {
    const prefix = simpleAddressMatch[1];
    const hexValue = simpleAddressMatch[2];
    const address = parseInt(hexValue, 16);
    
    return (
      <AddressLink
        address={address}
        format={hexValue.length === 2 ? 'hex2' : 'hex4'}
        prefix={prefix}
        worker={worker}
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