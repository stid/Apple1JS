import React, { useState, useEffect } from 'react';
import { WORKER_MESSAGES } from '../apple1/TSTypes';

interface StackViewerProps {
    worker: Worker;
    stackPointer?: number; // Current stack pointer value
}

interface StackMemoryData {
    [address: string]: number;
}

const StackViewer: React.FC<StackViewerProps> = ({ worker, stackPointer = 0xFF }) => {
    const [stackData, setStackData] = useState<StackMemoryData>({});
    
    // 6502 stack is at $0100-$01FF
    const STACK_BASE = 0x0100;
    const STACK_SIZE = 0x100;

    // Request stack memory data
    useEffect(() => {
        const requestStackMemory = () => {
            worker.postMessage({
                type: WORKER_MESSAGES.GET_MEMORY_RANGE,
                data: {
                    start: STACK_BASE,
                    length: STACK_SIZE
                }
            });
        };

        requestStackMemory();
        const interval = setInterval(requestStackMemory, 500);
        return () => clearInterval(interval);
    }, [worker]);

    // Listen for memory data from worker
    useEffect(() => {
        const handleMessage = (e: MessageEvent) => {
            if (e.data.type === WORKER_MESSAGES.MEMORY_RANGE_DATA) {
                // Convert array data to memory map
                const rangeData = e.data.data;
                if (rangeData && rangeData.data && rangeData.start >= STACK_BASE && rangeData.start < STACK_BASE + STACK_SIZE) {
                    const newStackData: StackMemoryData = {};
                    rangeData.data.forEach((value: number, index: number) => {
                        const addr = rangeData.start + index;
                        if (addr >= STACK_BASE && addr < STACK_BASE + STACK_SIZE) {
                            newStackData[`0x${addr.toString(16).padStart(4, '0').toUpperCase()}`] = value;
                        }
                    });
                    setStackData(prev => ({ ...prev, ...newStackData }));
                }
            }
        };

        worker.addEventListener('message', handleMessage);
        return () => worker.removeEventListener('message', handleMessage);
    }, [worker]);


    // Show only the active portion of the stack (from SP to FF)
    const renderStackEntries = () => {
        const entries = [];
        
        // Stack grows downward, so we show from current SP up to FF
        for (let offset = stackPointer; offset <= 0xFF; offset++) {
            const addr = STACK_BASE + offset;
            const addrKey = `0x${addr.toString(16).padStart(4, '0').toUpperCase()}`;
            const value = stackData[addrKey] ?? 0;
            const isCurrent = offset === stackPointer;
            
            entries.push(
                <div 
                    key={addr}
                    className={`flex justify-between items-center px-2 py-1 text-xs font-mono border-b border-border-subtle ${
                        isCurrent ? 'bg-info/20 border-info' : 'hover:bg-surface-hover/50'
                    }`}
                >
                    <span className="flex items-center gap-2">
                        {isCurrent && <span className="text-info">→</span>}
                        <span className="text-data-address">
                            {addr.toString(16).padStart(4, '0').toUpperCase()}
                        </span>
                    </span>
                    <span className="text-data-value">
                        {value.toString(16).padStart(2, '0').toUpperCase()}
                    </span>
                </div>
            );
        }
        
        // If stack is empty (SP = FF), show a message
        if (stackPointer === 0xFF) {
            entries.push(
                <div key="empty" className="text-center text-text-secondary text-xs py-2">
                    Stack is empty
                </div>
            );
        }
        
        return entries;
    };

    // Calculate stack usage
    const stackUsage = 0xFF - stackPointer;
    const stackPercentage = (stackUsage / 0xFF) * 100;

    return (
        <div className="h-full flex flex-col" style={{ minHeight: 0 }}>
            {/* Stack Info Header */}
            <div className="mb-sm">
                <div className="flex justify-between items-center mb-xs">
                    <span className="text-xs text-text-secondary">Stack Pointer:</span>
                    <span className="text-xs font-mono text-data-value">
                        ${stackPointer.toString(16).padStart(2, '0').toUpperCase()}
                    </span>
                </div>
                <div className="flex justify-between items-center mb-xs">
                    <span className="text-xs text-text-secondary">Usage:</span>
                    <span className="text-xs font-mono">
                        {stackUsage} / 255 bytes
                    </span>
                </div>
                {/* Stack usage bar */}
                <div className="w-full h-2 bg-surface-secondary rounded-full overflow-hidden">
                    <div 
                        className={`h-full transition-all ${
                            stackPercentage > 80 ? 'bg-error' : 
                            stackPercentage > 60 ? 'bg-warning' : 
                            'bg-success'
                        }`}
                        style={{ width: `${stackPercentage}%` }}
                    />
                </div>
            </div>

            {/* Stack Contents */}
            <div className="flex-1 overflow-auto bg-black/20 rounded border border-border-subtle">
                <div className="sticky top-0 bg-surface-primary border-b border-border-primary px-2 py-1">
                    <div className="flex justify-between text-xs text-text-secondary">
                        <span>Address</span>
                        <span>Value</span>
                    </div>
                </div>
                <div>
                    {renderStackEntries()}
                </div>
            </div>

            {/* Stack Operations Info */}
            <div className="mt-sm text-xs text-text-secondary">
                <div className="flex items-center gap-2">
                    <span className="text-info">→</span>
                    <span>Current SP</span>
                </div>
            </div>
        </div>
    );
};

export default StackViewer;