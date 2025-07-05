import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WORKER_MESSAGES } from '../apple1/TSTypes';

interface MemoryViewerProps {
    worker: Worker;
    startAddress?: number;
}

interface MemoryData {
    [address: string]: number;
}

const MemoryViewerPaginated: React.FC<MemoryViewerProps> = ({ 
    worker, 
    startAddress = 0x0000
}) => {
    const [memoryData, setMemoryData] = useState<MemoryData>({});
    const [currentAddress, setCurrentAddress] = useState(startAddress);
    const [addressInput, setAddressInput] = useState(startAddress.toString(16).padStart(4, '0').toUpperCase());
    const [editingCell, setEditingCell] = useState<number | null>(null);
    const [editValue, setEditValue] = useState('');

    const bytesPerRow = 16;
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [visibleRows, setVisibleRows] = useState(15);
    
    // Calculate visible rows based on actual container
    useEffect(() => {
        const calculateRows = () => {
            if (!contentRef.current) return;
            
            const content = contentRef.current;
            
            // Wait a frame for layout to complete
            requestAnimationFrame(() => {
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
        setAddressInput(currentAddress.toString(16).padStart(4, '0').toUpperCase());
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
        const interval = setInterval(requestMemory, 500);
        return () => clearInterval(interval);
    }, [worker, currentAddress, size]);

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
        }
    };

    const navigateUp = useCallback(() => {
        const newAddr = Math.max(0, currentAddress - size);
        setCurrentAddress(newAddr);
    }, [currentAddress, size]);

    const navigateDown = useCallback(() => {
        const newAddr = Math.min(0xFFFF - size + 1, currentAddress + size);
        setCurrentAddress(newAddr);
    }, [currentAddress, size]);

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

    const handleCellClick = (address: number) => {
        setEditingCell(address);
        const value = memoryData[`0x${address.toString(16).padStart(4, '0').toUpperCase()}`] || 0;
        setEditValue(value.toString(16).padStart(2, '0').toUpperCase());
    };

    const handleCellEdit = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
        if (value.length <= 2) {
            setEditValue(value);
        }
    };

    const handleCellEditComplete = () => {
        if (editingCell !== null && editValue.length === 2) {
            const value = parseInt(editValue, 16);
            // TODO: Implement memory write when worker supports it
            console.log('Memory write not yet implemented:', editingCell, value);
        }
        setEditingCell(null);
        setEditValue('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === 'Tab') {
            handleCellEditComplete();
        } else if (e.key === 'Escape') {
            setEditingCell(null);
            setEditValue('');
        }
    };

    const renderMemoryRow = (rowIndex: number) => {
        const baseAddr = currentAddress + (rowIndex * bytesPerRow);
        if (baseAddr > 0xFFFF) return null;
        
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
                cells.push(<td key={`hex-${i}`} className="px-1 py-1"></td>);
                asciiChars.push(' ');
                continue;
            }
            
            const addrKey = `0x${addr.toString(16).padStart(4, '0').toUpperCase()}`;
            const value = memoryData[addrKey] ?? 0;
            const isEditing = editingCell === addr;

            cells.push(
                <td 
                    key={`hex-${i}`} 
                    className="px-1 py-1 text-center cursor-pointer hover:bg-surface-hover"
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
            <td key="ascii" className="px-2 py-1 text-text-secondary font-mono text-xs border-l border-border-subtle whitespace-nowrap">
                {asciiChars.join('')}
            </td>
        );

        return (
            <tr key={rowIndex} className="border-b border-border-subtle hover:bg-surface-hover/50" style={{ height: '24px' }}>
                {cells}
            </tr>
        );
    };

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
                    ${currentAddress.toString(16).padStart(4, '0').toUpperCase()} - ${Math.min(0xFFFF, currentAddress + size - 1).toString(16).padStart(4, '0').toUpperCase()}
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
                                <th key={i} className="px-1 py-1 text-center text-xs text-text-secondary font-normal">
                                    {i.toString(16).toUpperCase()}
                                </th>
                            ))}
                            <th className="px-2 py-1 text-left text-xs text-text-secondary font-normal border-l border-border-subtle whitespace-nowrap">
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