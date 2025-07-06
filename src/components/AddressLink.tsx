import React, { useCallback } from 'react';
import { useDebuggerNavigation } from '../contexts/DebuggerNavigationContext';
import { WORKER_MESSAGES } from '../apple1/TSTypes';

/**
 * AddressLink - Clickable address component with context menu
 * 
 * Menu Color Semantics:
 * - Navigation actions: text-primary → hover:text-accent (green)
 * - Execution actions: text-warning (amber) with special hover
 * - Icons: Subtle opacity-60 for navigation, full opacity for actions
 */

interface AddressLinkProps {
  address: number;
  className?: string;
  children?: React.ReactNode;
  format?: 'hex4' | 'hex2' | 'raw';
  prefix?: string;
  showContextMenu?: boolean;
  worker?: Worker;
  showRunToCursor?: boolean;
}

const AddressLink: React.FC<AddressLinkProps> = ({
  address,
  className = '',
  children,
  format = 'hex4',
  prefix = '$',
  showContextMenu = false,
  worker,
  showRunToCursor = false,
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

  const showContextMenuInternal = useCallback((e: React.MouseEvent) => {
    if (!showContextMenu) return;
    
    const menu = document.createElement('div');
    menu.className = 'absolute bg-surface-primary border border-border-default rounded-md shadow-xl py-1 z-50 min-w-[180px]';
    menu.style.left = `${e.pageX}px`;
    menu.style.top = `${e.pageY}px`;
    
    const disassemblyOption = document.createElement('button');
    disassemblyOption.className = 'block w-full text-left px-3 py-1 hover:bg-surface-secondary text-sm text-text-primary hover:text-text-accent transition-colors';
    disassemblyOption.innerHTML = '<span class="mr-2 opacity-60">↗</span>View in Disassembly';
    disassemblyOption.onclick = () => {
      navigate(address, 'disassembly');
      document.body.removeChild(menu);
    };
    
    const memoryOption = document.createElement('button');
    memoryOption.className = 'block w-full text-left px-3 py-1 hover:bg-surface-secondary text-sm text-text-primary hover:text-text-accent transition-colors';
    memoryOption.innerHTML = '<span class="mr-2 opacity-60">⬡</span>View in Memory Editor';
    memoryOption.onclick = () => {
      navigate(address, 'memory');
      document.body.removeChild(menu);
    };
    
    menu.appendChild(disassemblyOption);
    menu.appendChild(memoryOption);
    
    // Add run-to-cursor option if enabled
    if (worker && showRunToCursor) {
      const separator = document.createElement('div');
      separator.className = 'border-t border-border-subtle my-1';
      menu.appendChild(separator);
      
      const runToCursorOption = document.createElement('button');
      runToCursorOption.className = 'block w-full text-left px-3 py-1 hover:bg-warning/20 text-sm text-warning font-medium transition-colors';
      runToCursorOption.innerHTML = '<span class="mr-2">▶</span>Run to Cursor';
      runToCursorOption.onclick = () => {
        worker.postMessage({
          type: WORKER_MESSAGES.RUN_TO_ADDRESS,
          data: address
        });
        document.body.removeChild(menu);
      };
      menu.appendChild(runToCursorOption);
    }
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
  }, [address, navigate, showContextMenu, worker, showRunToCursor]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Ctrl/Cmd+Click = Direct navigation (like VS Code hyperlinks)
    if (e.ctrlKey || e.metaKey) {
      navigate(address, 'disassembly');
    } else {
      // Normal click = Show context menu for all options
      showContextMenuInternal(e);
    }
  }, [address, navigate, showContextMenuInternal]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    showContextMenuInternal(e);
  }, [showContextMenuInternal]);

  // Add onMouseDown to capture right-click earlier
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 2) { // Right click
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  return (
    <button
      className={`cursor-pointer hover:underline hover:text-data-address-hover hover:bg-data-address/10 hover:px-1 hover:-mx-1 rounded transition-all duration-150 text-data-address ${className} bg-transparent border-none p-0 m-0 font-inherit`}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onMouseDown={handleMouseDown}
      title={
        showContextMenu
          ? 'Click for menu • Ctrl/Cmd+Click to navigate'
          : 'Ctrl/Cmd+Click to navigate'
      }
      style={{ 
        display: 'inline',
        textAlign: 'inherit',
        textDecoration: 'inherit',
        lineHeight: 'inherit'
      }}
    >
      {children || formatAddress()}
    </button>
  );
};

export default AddressLink;