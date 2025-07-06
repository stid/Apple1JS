import React, { useState, useEffect, useRef } from 'react';
import { WORKER_MESSAGES } from '../apple1/TSTypes';
import { useLogging } from '../contexts/LoggingContext';

interface MemoryViewerProps {
    worker: Worker;
    startAddress?: number;
    size?: number;
}

interface MemoryData {
    [address: string]: number;
}

const MemoryViewer: React.FC<MemoryViewerProps> = ({ 
    worker, 
    startAddress = 0x0000,
    size = 256 // Show 16 rows of 16 bytes by default
}) => {
    const [memoryData, setMemoryData] = useState<MemoryData>({});
    const [currentAddress, setCurrentAddress] = useState(startAddress);
    const [addressInput, setAddressInput] = useState(startAddress.toString(16).padStart(4, '0').toUpperCase());
    const [editingCell, setEditingCell] = useState<number | null>(null);
    const [editValue, setEditValue] = useState('');
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const { addMessage } = useLogging();

    const bytesPerRow = 16;
    const numRows = Math.ceil(size / bytesPerRow);

    // Update address input when currentAddress changes
    useEffect(() => {
        setAddressInput(currentAddress.toString(16).padStart(4, '0').toUpperCase());
    }, [currentAddress]);

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
        const interval = setInterval(requestMemory, 500);
        return () => clearInterval(interval);
    }, [worker, currentAddress, size]);

    // Listen for memory data from worker
    useEffect(() => {
        const handleMessage = (e: MessageEvent) => {
            if (e.data.type === WORKER_MESSAGES.MEMORY_RANGE_DATA) {
                // Convert array data to memory map
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
            setAddressInput(addr.toString(16).padStart(4, '0').toUpperCase());
            // Reset scroll to top when jumping to a new address
            setTimeout(() => {
                if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollTop = 0;
                }
            }, 50);
        }
    };

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
            // Send memory write to worker
            // TODO: Implement memory write when worker supports it
            addMessage({
                level: 'info',
                source: 'MemoryViewer',
                message: `Memory write not yet implemented: address=${editingCell.toString(16).toUpperCase()}, value=${value.toString(16).toUpperCase()}`
            });
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
        const cells = [];
        const asciiChars = [];

        // Address column
        cells.push(
            <td key="addr" className="px-2 py-1 text-data-address font-mono text-xs">
                {baseAddr.toString(16).padStart(4, '0').toUpperCase()}:
            </td>
        );

        // Hex bytes
        for (let i = 0; i < bytesPerRow; i++) {
            const addr = baseAddr + i;
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
            <td key="ascii" className="px-2 py-1 text-text-secondary font-mono text-xs border-l border-border-subtle">
                {asciiChars.join('')}
            </td>
        );

        return (
            <tr key={rowIndex} className="border-b border-border-subtle hover:bg-surface-hover/50">
                {cells}
            </tr>
        );
    };

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
                    ${currentAddress.toString(16).padStart(4, '0').toUpperCase()} - ${(currentAddress + size - 1).toString(16).padStart(4, '0').toUpperCase()}
                </div>
                <div className="flex gap-xs">
                    <button
                        onClick={() => {
                            const newAddr = Math.max(0, currentAddress - size);
                            setCurrentAddress(newAddr);
                            setAddressInput(newAddr.toString(16).padStart(4, '0').toUpperCase());
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
                            setAddressInput(newAddr.toString(16).padStart(4, '0').toUpperCase());
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
                                    {i.toString(16).toUpperCase()}
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