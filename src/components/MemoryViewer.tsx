import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { WORKER_MESSAGES, sendWorkerMessage, MemoryRegion, MemoryMapData } from '../apple1/types/worker-messages';
import AddressLink from './AddressLink';
import { Formatters } from '../utils/formatters';
import { DEBUG_REFRESH_RATES } from '../constants/ui';

interface MemoryViewerProps {
    worker: Worker;
    startAddress?: number;
    size?: number;
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
    const cells = [];
    const asciiChars = [];

    // Address column
    cells.push(
        <td key="addr" className="px-2 py-1 font-mono text-xs">
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
        const addrKey = `0x${Formatters.hex(addr, 4)}`;
        const value = memoryData[addrKey] ?? 0;
        const isEditing = editingCell === addr;
        const region = getMemoryRegion(addr);
        // Debug for FE00 range
        if (addr >= 0xFE00 && addr <= 0xFE0F) {
            console.log(`Address ${addr.toString(16).toUpperCase()}: region=`, region);
        }
        
        // Determine cell styling based on memory type
        const getCellStyle = () => {
            if (!region) return 'bg-surface-tertiary/50 cursor-not-allowed';
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
                className={`px-1 py-1 text-center ${isWritable ? 'cursor-pointer hover:bg-surface-hover' : ''} ${getCellStyle()}`}
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
                    <span 
                        className="font-mono text-xs !text-gray-500"
                        data-addr={addr.toString(16).toUpperCase()}
                        data-region-type={region?.type || 'undefined'}
                        style={{ color: 'red' }}
                    >
                        XX
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
        <td key="ascii" className="px-2 py-1 text-text-secondary font-mono text-xs border-l border-border-subtle">
            {asciiChars.join('')}
        </td>
    );

    return (
        <tr className="border-b border-border-subtle hover:bg-surface-hover/50">
            {cells}
        </tr>
    );
});
/* eslint-enable react/prop-types */

MemoryRow.displayName = 'MemoryRow';

const MemoryViewer: React.FC<MemoryViewerProps> = ({ 
    worker, 
    startAddress = 0x0000,
    size = 256 // Show 16 rows of 16 bytes by default
}) => {
    const [memoryData, setMemoryData] = useState<MemoryData>({});
    const [currentAddress, setCurrentAddress] = useState(startAddress);
    const [addressInput, setAddressInput] = useState(Formatters.hex(startAddress, 4));
    const [editingCell, setEditingCell] = useState<number | null>(null);
    const [editValue, setEditValue] = useState('');
    const [memoryMap, setMemoryMap] = useState<MemoryRegion[]>([]);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const bytesPerRow = 16;
    const numRows = Math.ceil(size / bytesPerRow);

    // Update address input when currentAddress changes
    useEffect(() => {
        setAddressInput(Formatters.hex(currentAddress, 4));
    }, [currentAddress]);
    
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

    // Request memory data
    useEffect(() => {
        const requestMemory = () => {
            // Request memory range from worker
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
                // Convert array data to memory map
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
            setCurrentAddress(addr);
            setAddressInput(Formatters.hex(addr, 4));
            // Reset scroll to top when jumping to a new address
            setTimeout(() => {
                if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollTop = 0;
                }
            }, 50);
        }
    };

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
        <div className="h-full flex flex-col" style={{ minHeight: 0 }}>
            {/* Controls */}
            <div className="flex items-center gap-sm mb-sm">
                <label className="text-xs text-text-secondary">Address:</label>
                <input
                    type="text"
                    value={addressInput}
                    onChange={handleAddressChange}
                    onKeyDown={handleAddressSubmit}
                    className="w-20 px-2 py-1 text-xs font-mono bg-surface-primary border border-border-primary rounded text-data-address focus:border-border-accent focus:outline-none"
                    placeholder="0000"
                />
                <span className="text-xs text-text-muted ml-sm">(Press Enter)</span>
                <div className="flex-1 text-xs text-text-secondary text-center font-mono">
                    ${Formatters.hex(currentAddress, 4)} - ${Formatters.hex(currentAddress + size - 1, 4)}
                </div>
                <div className="flex gap-xs">
                    <button
                        onClick={() => {
                            const newAddr = Math.max(0, currentAddress - size);
                            setCurrentAddress(newAddr);
                            setAddressInput(Formatters.hex(newAddr, 4));
                            // Scroll to bottom when going up (to show continuity)
                            setTimeout(() => {
                                if (scrollContainerRef.current) {
                                    scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
                                }
                            }, 50);
                        }}
                        className="px-2 py-1 text-xs bg-surface-primary border border-border-primary rounded hover:bg-surface-hover"
                    >
                        ↑
                    </button>
                    <button
                        onClick={() => {
                            const newAddr = Math.min(0xFFFF - size + 1, currentAddress + size);
                            setCurrentAddress(newAddr);
                            setAddressInput(Formatters.hex(newAddr, 4));
                            // Scroll to top when going down (to show continuity)
                            setTimeout(() => {
                                if (scrollContainerRef.current) {
                                    scrollContainerRef.current.scrollTop = 0;
                                }
                            }, 50);
                        }}
                        className="px-2 py-1 text-xs bg-surface-primary border border-border-primary rounded hover:bg-surface-hover"
                    >
                        ↓
                    </button>
                </div>
            </div>

            {/* Memory Table */}
            <div ref={scrollContainerRef} className="flex-1 overflow-auto bg-black/20 rounded border border-border-subtle">
                <table className="w-full">
                    <thead className="sticky top-0 bg-surface-primary border-b border-border-primary">
                        <tr>
                            <th className="px-2 py-1 text-left text-xs text-text-secondary font-normal">Addr</th>
                            {Array.from({ length: bytesPerRow }, (_, i) => (
                                <th key={i} className="px-1 py-1 text-center text-xs text-text-secondary font-normal">
                                    {Formatters.hex(i, 1)}
                                </th>
                            ))}
                            <th className="px-2 py-1 text-left text-xs text-text-secondary font-normal border-l border-border-subtle">
                                ASCII
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: numRows }, (_, i) => renderMemoryRow(i))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MemoryViewer;