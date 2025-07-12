import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { WORKER_MESSAGES, sendWorkerMessage, MemoryRegion, MemoryMapData } from '../apple1/types/worker-messages';
import { useLogging } from '../contexts/LoggingContext';
import { useNavigableComponent } from '../hooks/useNavigableComponent';
import AddressLink from './AddressLink';
import { Formatters } from '../utils/formatters';
import { DEBUG_REFRESH_RATES } from '../constants/ui';

interface MemoryViewerProps {
    worker: Worker;
    startAddress?: number;
    currentAddress?: number;
    onAddressChange?: (address: number) => void;
}

interface MemoryData {
    [address: string]: number;
}

interface MemoryRowProps {
    baseAddr: number;
    bytesPerRow: number;
    memoryData: MemoryData;
    editingCell: number | null;
    editValue: string;
    worker: Worker;
    maxAddress: number;
    memoryMap: MemoryRegion[];
    onCellClick: (address: number) => void;
    onCellEdit: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onCellEditComplete: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
}

// Memoized memory row component - only re-renders if its props change
/* eslint-disable react/prop-types */
const MemoryRow = memo<MemoryRowProps>(({ 
    baseAddr, 
    bytesPerRow, 
    memoryData, 
    editingCell, 
    editValue, 
    worker,
    maxAddress,
    memoryMap,
    onCellClick,
    onCellEdit,
    onCellEditComplete,
    onKeyDown
}) => {
    // Helper to find memory region for an address
    const getMemoryRegion = (address: number): MemoryRegion | undefined => {
        return memoryMap.find(region => address >= region.start && address <= region.end);
    };
    if (baseAddr > maxAddress) return null;
    
    const cells = [];
    const asciiChars = [];

    // Address column
    cells.push(
        <td key="addr" className="px-2 py-1 font-mono text-xs whitespace-nowrap">
            <AddressLink
                address={baseAddr}
                format="hex4"
                prefix=""
                worker={worker}
                showContextMenu={true}
                showRunToCursor={true}
                className="font-mono text-xs"
            />
            <span className="text-data-address">:</span>
        </td>
    );

    // Hex bytes
    for (let i = 0; i < bytesPerRow; i++) {
        const addr = baseAddr + i;
        if (addr > maxAddress) {
            cells.push(<td key={`hex-${i}`} className="px-2 py-1"></td>);
            asciiChars.push(' ');
            continue;
        }
        
        const addrKey = `0x${Formatters.hex(addr, 4)}`;
        const value = memoryData[addrKey] ?? 0;
        const isEditing = editingCell === addr;
        const region = getMemoryRegion(addr);
        
        // Determine cell styling based on memory type
        const getCellStyle = () => {
            if (!region) return '';
            switch (region.type) {
                case 'ROM':
                    return 'bg-semantic-error/10 cursor-not-allowed';
                case 'RAM':
                    return '';
                case 'IO':
                    return 'bg-semantic-info/10';
                case 'UNMAPPED':
                    return 'bg-surface-tertiary/50 cursor-not-allowed';
                default:
                    return '';
            }
        };
        
        const isWritable = region?.writable ?? false;

        cells.push(
            <td 
                key={`hex-${i}`} 
                className={`px-2 py-1 text-center ${isWritable ? 'cursor-pointer hover:bg-surface-hover' : ''} ${getCellStyle()}`}
                onClick={() => isWritable && onCellClick(addr)}
                title={region ? `${region.type}: ${region.description}` : ''}
            >
                {isEditing ? (
                    <input
                        type="text"
                        value={editValue}
                        onChange={onCellEdit}
                        onBlur={onCellEditComplete}
                        onKeyDown={onKeyDown}
                        onFocus={(e) => e.target.select()}
                        className="w-6 text-center bg-info text-black font-mono text-xs rounded"
                        autoFocus
                    />
                ) : (
                    <span className={`font-mono text-xs ${!region || region.type === 'UNMAPPED' ? '!text-gray-500' : 'text-data-value'}`}>
                        {Formatters.hex(value, 2)}
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

    return (
        <tr className="border-b border-border-subtle hover:bg-surface-hover/50" style={{ height: '24px' }}>
            {cells}
        </tr>
    );
});
/* eslint-enable react/prop-types */

MemoryRow.displayName = 'MemoryRow';

const MemoryViewerPaginated: React.FC<MemoryViewerProps> = ({ 
    worker, 
    startAddress = 0x0000,
    currentAddress: externalAddress,
    onAddressChange
}) => {
    const [memoryData, setMemoryData] = useState<MemoryData>({});
    const { currentAddress, navigateInternal } = useNavigableComponent({
        initialAddress: externalAddress ?? startAddress,
        ...(onAddressChange !== undefined && { onAddressChange })
    });
    const [addressInput, setAddressInput] = useState(Formatters.hex(externalAddress ?? startAddress, 4));
    const [editingCell, setEditingCell] = useState<number | null>(null);
    const [editValue, setEditValue] = useState('');
    const [memoryMap, setMemoryMap] = useState<MemoryRegion[]>([]);
    const { addMessage } = useLogging();

    const bytesPerRow = 16;
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [visibleRows, setVisibleRows] = useState(15);
    
    // Fetch memory map on mount
    useEffect(() => {
        if (!worker) return;
        
        const handleMessage = (e: MessageEvent) => {
            if (e.data.type === WORKER_MESSAGES.MEMORY_MAP_DATA) {
                const mapData = e.data.data as MemoryMapData;
                setMemoryMap(mapData.regions);
            }
        };
        
        worker.addEventListener('message', handleMessage);
        sendWorkerMessage(worker, WORKER_MESSAGES.GET_MEMORY_MAP);
        
        return () => {
            worker.removeEventListener('message', handleMessage);
        };
    }, [worker]);
    
    // Calculate visible rows based on actual container
    useEffect(() => {
        const calculateRows = () => {
            if (!contentRef.current) return;
            
            const content = contentRef.current;
            
            // Wait a frame for layout to complete
            window.requestAnimationFrame(() => {
                const table = content.querySelector('table');
                if (!table) return;
                
                const thead = table.querySelector('thead') as HTMLElement;
                if (!thead) return;
                
                // Get actual measurements
                const contentRect = content.getBoundingClientRect();
                const theadRect = thead.getBoundingClientRect();
                
                // Get a sample row to measure actual height
                const tbody = table.querySelector('tbody');
                let actualRowHeight = 25;
                
                if (tbody) {
                    const firstRow = tbody.querySelector('tr');
                    if (firstRow) {
                        const rowRect = firstRow.getBoundingClientRect();
                        actualRowHeight = rowRect.height;
                    }
                }
                
                // Available height for tbody
                const availableHeight = contentRect.height - (theadRect.height || 28);
                
                // Calculate rows with actual measured height
                const possibleRows = Math.floor(availableHeight / actualRowHeight);
                
                // Set visible rows with minimum of 3
                setVisibleRows(Math.max(3, possibleRows));
            });
        };
        
        // Initial calculation
        const timer = setTimeout(calculateRows, 150);
        
        // Recalculate on resize
        const resizeObserver = new ResizeObserver(() => {
            calculateRows();
        });
        
        if (contentRef.current) {
            resizeObserver.observe(contentRef.current);
        }
        
        window.addEventListener('resize', calculateRows);
        
        return () => {
            clearTimeout(timer);
            resizeObserver.disconnect();
            window.removeEventListener('resize', calculateRows);
        };
    }, []);
    
    const effectiveRows = visibleRows;
    const size = effectiveRows * bytesPerRow;
    
    // Update address input when currentAddress changes
    useEffect(() => {
        setAddressInput(Formatters.hex(currentAddress, 4));
    }, [currentAddress]);

    // Request memory data
    useEffect(() => {
        const requestMemory = () => {
            worker.postMessage({
                type: WORKER_MESSAGES.GET_MEMORY_RANGE,
                data: {
                    start: currentAddress,
                    length: size
                }
            });
        };

        requestMemory();
        const interval = setInterval(requestMemory, DEBUG_REFRESH_RATES.MEMORY_VIEW);
        return () => clearInterval(interval);
    }, [worker, currentAddress, size]);

    // Listen for memory data from worker
    useEffect(() => {
        const handleMessage = (e: MessageEvent) => {
            if (e.data.type === WORKER_MESSAGES.MEMORY_RANGE_DATA) {
                const newMemData: MemoryData = {};
                const rangeData = e.data.data;
                if (rangeData && rangeData.data) {
                    rangeData.data.forEach((value: number, index: number) => {
                        const addr = rangeData.start + index;
                        newMemData[`0x${Formatters.hex(addr, 4)}`] = value;
                    });
                }
                
                // Only update state if memory actually changed
                setMemoryData(prevData => {
                    // Quick check: if sizes differ, data definitely changed
                    const prevKeys = Object.keys(prevData);
                    const newKeys = Object.keys(newMemData);
                    if (prevKeys.length !== newKeys.length) {
                        return newMemData;
                    }
                    
                    // Check if any values changed
                    for (const key of newKeys) {
                        if (prevData[key] !== newMemData[key]) {
                            return newMemData;
                        }
                    }
                    
                    // No changes, return previous data to avoid re-render
                    return prevData;
                });
            }
        };

        worker.addEventListener('message', handleMessage);
        return () => worker.removeEventListener('message', handleMessage);
    }, [worker]);

    const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
        if (value.length <= 4) {
            setAddressInput(value);
        }
    };

    const handleAddressSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const addr = parseInt(addressInput || '0', 16);
            if (!isNaN(addr) && addr >= 0 && addr <= 0xFFFF) {
                // Ensure the address won't cause the view to exceed memory bounds
                const maxStartAddr = Math.max(0, 0xFFFF - size + 1);
                const validAddr = Math.min(addr, maxStartAddr);
                navigateInternal(validAddr);
            }
        }
    };

    const navigateUp = useCallback(() => {
        const newAddr = Math.max(0, currentAddress - size);
        navigateInternal(newAddr);
    }, [currentAddress, size, navigateInternal]);

    const navigateDown = useCallback(() => {
        // Calculate the maximum valid starting address
        const maxStartAddr = Math.max(0, 0xFFFF - size + 1);
        
        // Calculate next address
        const nextAddr = currentAddress + size;
        
        // Ensure we don't go past the maximum valid start address
        if (nextAddr > maxStartAddr) {
            // Snap to the last valid page that shows up to 0xFFFF
            navigateInternal(maxStartAddr);
        } else {
            navigateInternal(nextAddr);
        }
    }, [currentAddress, size, navigateInternal]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (editingCell !== null) return; // Don't navigate while editing
            
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                navigateUp();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                navigateDown();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [editingCell, navigateUp, navigateDown]);

    const handleCellClick = useCallback((address: number) => {
        setEditingCell(address);
        const value = memoryData[`0x${Formatters.hex(address, 4)}`] || 0;
        setEditValue(Formatters.hex(value, 2));
    }, [memoryData]);

    const handleCellEdit = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
        if (value.length <= 2) {
            setEditValue(value);
        }
    }, []);

    const handleCellEditComplete = useCallback(() => {
        if (editingCell !== null && editValue.length > 0) {
            // Pad single digit with leading zero
            const paddedValue = editValue.padStart(2, '0');
            const value = parseInt(paddedValue, 16);
            // Send memory write to worker
            sendWorkerMessage(worker, WORKER_MESSAGES.WRITE_MEMORY, {
                address: editingCell,
                value: value
            });
        }
        setEditingCell(null);
        setEditValue('');
    }, [editingCell, editValue, worker]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleCellEditComplete();
        } else if (e.key === 'Tab') {
            e.preventDefault(); // Prevent default tab behavior
            handleCellEditComplete();
            
            // Move to next cell if not at the end
            if (editingCell !== null) {
                const maxAddress = currentAddress + size - 1;
                const nextAddress = editingCell + 1;
                
                if (nextAddress <= maxAddress && nextAddress <= 0xFFFF) {
                    // Small delay to ensure the current edit is processed
                    setTimeout(() => {
                        handleCellClick(nextAddress);
                    }, 50);
                }
            }
        } else if (e.key === 'Escape') {
            setEditingCell(null);
            setEditValue('');
        }
    }, [editingCell, currentAddress, size, handleCellEditComplete, handleCellClick]);

    const renderMemoryRow = useCallback((rowIndex: number) => {
        const baseAddr = currentAddress + (rowIndex * bytesPerRow);
        
        return (
            <MemoryRow
                key={baseAddr}
                baseAddr={baseAddr}
                bytesPerRow={bytesPerRow}
                memoryData={memoryData}
                editingCell={editingCell}
                editValue={editValue}
                worker={worker}
                maxAddress={0xFFFF}
                memoryMap={memoryMap}
                onCellClick={handleCellClick}
                onCellEdit={handleCellEdit}
                onCellEditComplete={handleCellEditComplete}
                onKeyDown={handleKeyDown}
            />
        );
    }, [currentAddress, bytesPerRow, memoryData, editingCell, editValue, worker, memoryMap,
        handleCellClick, handleCellEdit, handleCellEditComplete, handleKeyDown]);

    return (
        <div ref={containerRef} className="h-full flex flex-col bg-surface-primary rounded-lg border border-border-primary">
            {/* Controls */}
            <div className="flex items-center gap-sm p-sm border-b border-border-subtle">
                <label className="text-xs text-text-secondary">Address:</label>
                <input
                    type="text"
                    value={addressInput}
                    onChange={handleAddressChange}
                    onKeyDown={handleAddressSubmit}
                    className="w-20 px-2 py-1 text-xs font-mono bg-black/40 border border-border-primary rounded text-data-address focus:border-border-accent focus:outline-none"
                    placeholder="0000"
                />
                <div className="flex gap-xs">
                    <button
                        onClick={navigateUp}
                        className="px-2 py-1 text-xs bg-surface-secondary border border-border-primary rounded hover:bg-surface-hover"
                        title="Previous page (↑)"
                    >
                        ↑
                    </button>
                    <button
                        onClick={navigateDown}
                        className="px-2 py-1 text-xs bg-surface-secondary border border-border-primary rounded hover:bg-surface-hover"
                        title="Next page (↓)"
                    >
                        ↓
                    </button>
                </div>
                <div className="flex-1 text-xs text-text-secondary text-center font-mono">
                    ${Formatters.hex(currentAddress, 4)} - ${Formatters.hex(Math.min(0xFFFF, currentAddress + size - 1), 4)}
                </div>
                <div className="text-xs text-text-muted">
                    ↑↓: Navigate • {effectiveRows} rows
                </div>
            </div>

            {/* Memory Table - No scroll, fixed height based on visible rows */}
            <div ref={contentRef} className="flex-1 bg-black/20 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-surface-primary border-b border-border-primary">
                        <tr>
                            <th className="px-2 py-1 text-left text-xs text-text-secondary font-normal whitespace-nowrap">Addr</th>
                            {Array.from({ length: bytesPerRow }, (_, i) => (
                                <th key={i} className="px-2 py-1 text-center text-xs text-text-secondary font-normal">
                                    {Formatters.hex(i, 1)}
                                </th>
                            ))}
                            <th className="px-3 py-1 text-left text-xs text-text-secondary font-normal border-l border-border-subtle whitespace-nowrap">
                                ASCII
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: effectiveRows }, (_, i) => renderMemoryRow(i))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MemoryViewerPaginated;