import React, { useCallback } from 'react';
import { useDebuggerNavigation } from '../contexts/DebuggerNavigationContext';

interface AddressLinkProps {
  address: number;
  className?: string;
  children?: React.ReactNode;
  format?: 'hex4' | 'hex2' | 'raw';
  prefix?: string;
  showContextMenu?: boolean;
}

const AddressLink: React.FC<AddressLinkProps> = ({
  address,
  className = '',
  children,
  format = 'hex4',
  prefix = '$',
  showContextMenu = false,
}) => {
  const { navigate } = useDebuggerNavigation();

  const formatAddress = useCallback(() => {
    switch (format) {
      case 'hex4':
        return `${prefix}${address.toString(16).padStart(4, '0').toUpperCase()}`;
      case 'hex2':
        return `${prefix}${address.toString(16).padStart(2, '0').toUpperCase()}`;
      case 'raw':
        return address.toString();
      default:
        return `${prefix}${address.toString(16).padStart(4, '0').toUpperCase()}`;
    }
  }, [address, format, prefix]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    navigate(address, 'disassembly');
  }, [address, navigate]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (!showContextMenu) return;
    
    e.preventDefault();
    const menu = document.createElement('div');
    menu.className = 'absolute bg-surface-primary border border-border-default rounded shadow-lg py-1 z-50';
    menu.style.left = `${e.pageX}px`;
    menu.style.top = `${e.pageY}px`;
    
    const disassemblyOption = document.createElement('button');
    disassemblyOption.className = 'block w-full text-left px-3 py-1 hover:bg-surface-secondary text-sm';
    disassemblyOption.textContent = 'View in Disassembly';
    disassemblyOption.onclick = () => {
      navigate(address, 'disassembly');
      document.body.removeChild(menu);
    };
    
    const memoryOption = document.createElement('button');
    memoryOption.className = 'block w-full text-left px-3 py-1 hover:bg-surface-secondary text-sm';
    memoryOption.textContent = 'View in Memory Editor';
    memoryOption.onclick = () => {
      navigate(address, 'memory');
      document.body.removeChild(menu);
    };
    
    menu.appendChild(disassemblyOption);
    menu.appendChild(memoryOption);
    document.body.appendChild(menu);
    
    const removeMenu = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        document.body.removeChild(menu);
        document.removeEventListener('click', removeMenu);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', removeMenu);
    }, 0);
  }, [address, navigate, showContextMenu]);

  return (
    <span
      className={`cursor-pointer hover:underline text-data-address ${className}`}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      title={showContextMenu ? 'Click to view in disassembly, right-click for options' : 'Click to view in disassembly'}
    >
      {children || formatAddress()}
    </span>
  );
};

export default AddressLink;