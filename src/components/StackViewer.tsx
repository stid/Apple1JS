import React, { useState, useEffect } from 'react';
import AddressLink from './AddressLink';
import { Formatters } from '../utils/formatters';
import { DEBUG_REFRESH_RATES } from '../constants/ui';
import type { WorkerManager } from '../services/WorkerManager';
import { loggingService } from '../services/LoggingService';

interface StackViewerProps {
    workerManager: WorkerManager;
    stackPointer?: number; // Current stack pointer value
    /**
     * S at the start of the current run (see DualEngine.stackBase). The stack is
     * the bytes between S and this; without it the depth cannot be known.
     */
    stackBase?: number | undefined;
}

interface StackMemoryData {
    [address: string]: number;
}

const StackViewer: React.FC<StackViewerProps> = ({ workerManager, stackPointer = 0xff, stackBase }) => {
    const [stackData, setStackData] = useState<StackMemoryData>({});

    // 6502 stack is at $0100-$01FF
    const STACK_BASE = 0x0100;
    const STACK_SIZE = 0x100;

    // Request stack memory data
    useEffect(() => {
        const requestStackMemory = async () => {
            try {
                const memoryData = await workerManager.readMemoryRange(STACK_BASE, STACK_SIZE);
                if (memoryData) {
                    const newStackData: StackMemoryData = {};
                    memoryData.forEach((value: number, index: number) => {
                        const addr = STACK_BASE + index;
                        newStackData[Formatters.hexWord(addr)] = value;
                    });
                    setStackData(newStackData);
                }
            } catch (error) {
                loggingService.error('StackViewer', `Error reading stack memory: ${error}`);
            }
        };

        requestStackMemory();
        const interval = setInterval(requestStackMemory, DEBUG_REFRESH_RATES.STACK_VIEW);
        return () => clearInterval(interval);
    }, [workerManager]);

    // S points at the next free byte, so the last byte pushed is at S+1 and the
    // live stack runs from there up to the base. A base below S is a sampling
    // skew between the two polled values; treat it as empty.
    const depth = stackBase === undefined ? null : Math.max(0, stackBase - stackPointer);
    const topOfStack = stackPointer + 1;

    const renderStackEntries = () => {
        if (depth === null) {
            return <div className="text-center text-text-secondary text-xs py-2">Stack base not available</div>;
        }
        if (depth === 0) {
            return <div className="text-center text-text-secondary text-xs py-2">Stack is empty</div>;
        }

        const entries = [];
        for (let offset = topOfStack; offset <= stackPointer + depth; offset++) {
            const addr = STACK_BASE + offset;
            const value = stackData[Formatters.hexWord(addr)] ?? 0;
            const isTop = offset === topOfStack;

            entries.push(
                <div
                    key={addr}
                    data-testid={isTop ? 'stack-top' : undefined}
                    className={`flex justify-between items-center px-2 py-1 text-xs font-mono border-b border-border-subtle ${
                        isTop ? 'bg-info/20 border-info' : 'hover:bg-surface-hover/50'
                    }`}
                >
                    <span className="flex items-center gap-2">
                        {isTop && <span className="text-info">→</span>}
                        <AddressLink
                            address={addr}
                            format="hex4"
                            prefix=""
                            workerManager={workerManager}
                            showContextMenu={true}
                            showRunToCursor={true}
                            className="text-xs"
                        />
                    </span>
                    <span className="text-data-value">{Formatters.hex(value, 2)}</span>
                </div>,
            );
        }
        return entries;
    };

    const stackPercentage = ((depth ?? 0) / 0xff) * 100;

    return (
        <div className="flex flex-col">
            {/* Stack Info Header */}
            <div className="mb-sm">
                <div className="flex justify-between items-center mb-xs">
                    <span className="text-xs text-text-secondary">Stack pointer</span>
                    <span className="text-xs font-mono text-data-value">{Formatters.hexByte(stackPointer)}</span>
                </div>
                <div className="flex justify-between items-center mb-xs">
                    <span className="text-xs text-text-secondary">Depth</span>
                    <span className="text-xs font-mono" data-testid="stack-depth">
                        {depth === null ? 'unknown' : `${depth} ${depth === 1 ? 'byte' : 'bytes'}`}
                    </span>
                </div>
                {/* Stack depth bar, against the 255 bytes the page can hold */}
                <div className="w-full h-1.5 bg-surface-secondary rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all ${
                            stackPercentage > 80 ? 'bg-error' : stackPercentage > 60 ? 'bg-warning' : 'bg-success'
                        }`}
                        style={{ width: `${stackPercentage}%` }}
                    />
                </div>
            </div>

            {/* Stack contents: scrolls inside the card instead of stretching it */}
            <div
                data-testid="stack-entries"
                className="max-h-80 overflow-auto bg-surface-secondary rounded-md border border-border-subtle"
            >
                <div className="sticky top-0 bg-surface-secondary border-b border-border-primary px-2 py-1">
                    <div className="flex justify-between text-xs text-text-secondary">
                        <span>Address</span>
                        <span>Value</span>
                    </div>
                </div>
                <div>{renderStackEntries()}</div>
            </div>

            {/* Legend */}
            <div className="mt-sm text-xs text-text-secondary">
                <div className="flex items-center gap-2">
                    <span className="text-info">→</span>
                    <span>Top of stack (last byte pushed)</span>
                </div>
            </div>
        </div>
    );
};

export default StackViewer;
