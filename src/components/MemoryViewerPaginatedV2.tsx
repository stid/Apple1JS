import React, { useState, useEffect, useCallback } from 'react';
import { WORKER_MESSAGES } from '../apple1/TSTypes';
import PaginatedTableView from './PaginatedTableView';
import { usePaginatedTable } from '../hooks/usePaginatedTable';

interface MemoryViewerProps {
    worker: Worker;
    startAddress?: number;
}

interface MemoryData {
    [address: string]: number;
}

const MemoryViewerPaginatedV2: React.FC<MemoryViewerProps> = ({ 
    worker, 
    startAddress = 0x0000
}) => {
    const [memoryData, setMemoryData] = useState<MemoryData>({});
    const [editingCell, setEditingCell] = useState<number | null>(null);
    const [editValue, setEditValue] = useState('');
    
    const bytesPerRow = 16;
    
    // Use the pagination hook
    const {
        currentAddress,
        visibleRows,
        size,
        navigateUp,
        navigateDown,
        navigateTo,
        containerRef,
        contentRef,
        getAddressRange
    } = usePaginatedTable({
        initialAddress: startAddress,
        bytesPerRow,
        rowHeight: 25,
        onDataRequest: (addr, length) => {
            // Request memory data
            worker.postMessage({
                type: WORKER_MESSAGES.GET_MEMORY_RANGE,
                data: { start: addr, length }
            });
        }
    });
    
    // Listen for memory data from worker
    useEffect(() => {
        const handleMessage = (e: MessageEvent) => {
            if (e.data.type === WORKER_MESSAGES.MEMORY_RANGE_DATA) {
                const memData: MemoryData = {};
                const rangeData = e.data.data;
                if (rangeData && rangeData.data) {
                    rangeData.data.forEach((value: number, index: number) => {
                        const addr = rangeData.start + index;
                        memData[`0x${addr.toString(16).padStart(4, '0').toUpperCase()}`] = value;
                    });
                }
                setMemoryData(memData);
            }
        };

        worker.addEventListener('message', handleMessage);
        return () => worker.removeEventListener('message', handleMessage);
    }, [worker]);
    
    // Periodic refresh
    useEffect(() => {
        const interval = setInterval(() => {
            worker.postMessage({
                type: WORKER_MESSAGES.GET_MEMORY_RANGE,
                data: { start: currentAddress, length: size }
            });
        }, 500);
        return () => clearInterval(interval);
    }, [worker, currentAddress, size]);
    
    // Cell editing handlers
    const handleCellClick = useCallback((address: number) => {
        setEditingCell(address);
        const value = memoryData[`0x${address.toString(16).padStart(4, '0').toUpperCase()}`] || 0;
        setEditValue(value.toString(16).padStart(2, '0').toUpperCase());
    }, [memoryData]);
    
    const handleCellEdit = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
        if (value.length <= 2) {
            setEditValue(value);
        }
    }, []);
    
    const handleCellEditComplete = useCallback(() => {
        if (editingCell !== null && editValue.length === 2) {
            const value = parseInt(editValue, 16);
            // TODO: Implement memory write when worker supports it
            console.log('Memory write not yet implemented:', editingCell, value);
        }
        setEditingCell(null);
        setEditValue('');
    }, [editingCell, editValue]);
    
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === 'Tab') {
            handleCellEditComplete();
        } else if (e.key === 'Escape') {
            setEditingCell(null);
            setEditValue('');
        }
    }, [handleCellEditComplete]);
    
    // Keyboard navigation override to handle editing state
    useEffect(() => {
        const handleGlobalKeyDown = () => {
            if (editingCell !== null) {
                // Don't navigate while editing
                return;
            }
        };
        
        window.addEventListener('keydown', handleGlobalKeyDown, true);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
    }, [editingCell]);
    
    // Render functions for the generic table
    const renderTableHeader = () => (
        <thead className="bg-surface-primary border-b border-border-primary">
            <tr>
                <th className="px-2 py-1 text-left text-xs text-text-secondary font-normal whitespace-nowrap">
                    Addr
                </th>
                {Array.from({ length: bytesPerRow }, (_, i) => (
                    <th key={i} className="px-2 py-1 text-center text-xs text-text-secondary font-normal">
                        {i.toString(16).toUpperCase()}
                    </th>
                ))}
                <th className="px-3 py-1 text-left text-xs text-text-secondary font-normal border-l border-border-subtle whitespace-nowrap">
                    ASCII
                </th>
            </tr>
        </thead>
    );
    
    const renderTableRows = () => {
        const rows = [];
        
        for (let rowIndex = 0; rowIndex < visibleRows; rowIndex++) {
            const baseAddr = currentAddress + (rowIndex * bytesPerRow);
            if (baseAddr > 0xFFFF) break;
            
            const cells = [];
            const asciiChars = [];
            
            // Address column
            cells.push(
                <td key="addr" className="px-2 py-1 text-data-address font-mono text-xs whitespace-nowrap">
                    {baseAddr.toString(16).padStart(4, '0').toUpperCase()}:
                </td>
            );
            
            // Hex bytes
            for (let i = 0; i < bytesPerRow; i++) {
                const addr = baseAddr + i;
                if (addr > 0xFFFF) {
                    cells.push(<td key={`hex-${i}`} className="px-2 py-1"></td>);
                    asciiChars.push(' ');
                    continue;
                }
                
                const addrKey = `0x${addr.toString(16).padStart(4, '0').toUpperCase()}`;
                const value = memoryData[addrKey] ?? 0;
                const isEditing = editingCell === addr;
                
                cells.push(
                    <td 
                        key={`hex-${i}`} 
                        className="px-2 py-1 text-center cursor-pointer hover:bg-surface-hover"
                        onClick={() => handleCellClick(addr)}
                    >
                        {isEditing ? (
                            <input
                                type="text"
                                value={editValue}
                                onChange={handleCellEdit}
                                onBlur={handleCellEditComplete}
                                onKeyDown={handleKeyDown}
                                className="w-6 text-center bg-info text-black font-mono text-xs rounded"
                                autoFocus
                            />
                        ) : (
                            <span className="text-data-value font-mono text-xs">
                                {value.toString(16).padStart(2, '0').toUpperCase()}
                            </span>
                        )}
                    </td>
                );
                
                // ASCII representation
                const ascii = (value >= 32 && value <= 126) ? String.fromCharCode(value) : '.';
                asciiChars.push(ascii);
            }
            
            // ASCII column
            cells.push(
                <td key="ascii" className="px-3 py-1 text-text-secondary font-mono text-xs border-l border-border-subtle whitespace-nowrap">
                    {asciiChars.join('')}
                </td>
            );
            
            rows.push(
                <tr key={rowIndex} className="border-b border-border-subtle hover:bg-surface-hover/50" style={{ height: '24px' }}>
                    {cells}
                </tr>
            );
        }
        
        return rows;
    };
    
    return (
        <PaginatedTableView
            currentAddress={currentAddress}
            onAddressChange={navigateTo}
            onNavigateUp={navigateUp}
            onNavigateDown={navigateDown}
            addressRange={getAddressRange()}
            rowCount={visibleRows}
            renderTableHeader={renderTableHeader}
            renderTableRows={renderTableRows}
            keyboardShortcuts="↑↓: Navigate • Click cell to edit"
            containerRef={containerRef}
            contentRef={contentRef}
        />
    );
};

export default MemoryViewerPaginatedV2;