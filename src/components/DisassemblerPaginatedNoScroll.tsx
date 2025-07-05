import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WORKER_MESSAGES, MemoryRangeRequest, MemoryRangeData } from '../apple1/TSTypes';
import { OPCODES } from './Disassembler';
import { useVisibleRows } from '../hooks/useVisibleRows';

interface DisassemblerProps {
    worker: Worker;
}

interface DisassemblyLine {
    address: number;
    bytes: number[];
    instruction: string;
    operand?: string;
}

type ExecutionState = 'running' | 'paused' | 'stepping';

const DisassemblerPaginatedNoScroll: React.FC<DisassemblerProps> = ({ worker }) => {
    const [lines, setLines] = useState<DisassemblyLine[]>([]);
    const [currentPC, setCurrentPC] = useState<number>(0);
    const [startAddress, setStartAddress] = useState(0x0000);
    const [addressInput, setAddressInput] = useState('0000');
    const [breakpoints, setBreakpoints] = useState<Set<number>>(new Set());
    const [executionState, setExecutionState] = useState<ExecutionState>('running');
    const [isPaused, setIsPaused] = useState(false);
    
    const pcRowRef = useRef<HTMLTableRowElement>(null);
    
    // Calculate visible rows based on container height
    const { containerRef, visibleRows } = useVisibleRows({
        minRows: 10, // Increased minimum for better initial display
        rowHeight: 24, // Adjusted to match actual row height with padding
        headerHeight: 120 // Controls header + table header + shortcuts help
    });

    // Track the actual rendered lines for accurate pagination
    const [renderedLines, setRenderedLines] = useState<DisassemblyLine[]>([]);

    // We fetch more than needed to ensure we have enough instructions
    const MEMORY_CHUNK_SIZE = 512; // bytes - enough for various instruction sizes

    const disassembleMemory = useCallback((startAddr: number, length: number, memory: number[]): DisassemblyLine[] => {
        const result: DisassemblyLine[] = [];
        let addr = startAddr;
        
        while (addr < startAddr + length && addr < 0x10000) {
            const opcode = memory[addr - startAddr] || 0;
            const opcodeInfo = OPCODES[opcode];
            
            if (!opcodeInfo) {
                result.push({
                    address: addr,
                    bytes: [opcode],
                    instruction: '???',
                    operand: `$${opcode.toString(16).padStart(2, '0').toUpperCase()}`,
                });
                addr++;
                continue;
            }

            const bytes: number[] = [opcode];
            let operand = '';
            
            // Get operand bytes
            for (let i = 1; i < opcodeInfo.bytes; i++) {
                if (addr + i < 0x10000 && addr + i - startAddr < memory.length) {
                    bytes.push(memory[addr + i - startAddr] || 0);
                }
            }

            // Format operand based on addressing mode
            switch (opcodeInfo.mode) {
                case 'imp':
                case 'acc':
                    operand = '';
                    break;
                case 'imm':
                    operand = `#$${bytes[1]?.toString(16).padStart(2, '0').toUpperCase() || '00'}`;
                    break;
                case 'zp':
                    operand = `$${bytes[1]?.toString(16).padStart(2, '0').toUpperCase() || '00'}`;
                    break;
                case 'zpx':
                    operand = `$${bytes[1]?.toString(16).padStart(2, '0').toUpperCase() || '00'},X`;
                    break;
                case 'zpy':
                    operand = `$${bytes[1]?.toString(16).padStart(2, '0').toUpperCase() || '00'},Y`;
                    break;
                case 'abs': {
                    const absAddr = (bytes[2] || 0) << 8 | (bytes[1] || 0);
                    operand = `$${absAddr.toString(16).padStart(4, '0').toUpperCase()}`;
                    break;
                }
                case 'abx': {
                    const abxAddr = (bytes[2] || 0) << 8 | (bytes[1] || 0);
                    operand = `$${abxAddr.toString(16).padStart(4, '0').toUpperCase()},X`;
                    break;
                }
                case 'aby': {
                    const abyAddr = (bytes[2] || 0) << 8 | (bytes[1] || 0);
                    operand = `$${abyAddr.toString(16).padStart(4, '0').toUpperCase()},Y`;
                    break;
                }
                case 'ind': {
                    const indAddr = (bytes[2] || 0) << 8 | (bytes[1] || 0);
                    operand = `($${indAddr.toString(16).padStart(4, '0').toUpperCase()})`;
                    break;
                }
                case 'izx':
                    operand = `($${bytes[1]?.toString(16).padStart(2, '0').toUpperCase() || '00'},X)`;
                    break;
                case 'izy':
                    operand = `($${bytes[1]?.toString(16).padStart(2, '0').toUpperCase() || '00'}),Y`;
                    break;
                case 'rel': {
                    const offset = bytes[1] || 0;
                    const target = addr + 2 + (offset > 127 ? offset - 256 : offset);
                    operand = `$${target.toString(16).padStart(4, '0').toUpperCase()}`;
                    break;
                }
            }

            result.push({
                address: addr,
                bytes: bytes,
                instruction: opcodeInfo.name,
                operand: operand,
            });

            addr += opcodeInfo.bytes;
        }
        
        return result;
    }, []);

    // Load memory and trim to visible rows
    const loadMemoryAt = useCallback((addr: number) => {
        if (addr < 0 || addr > 0xFFFF) return;
        
        setStartAddress(addr);
        setAddressInput(addr.toString(16).padStart(4, '0').toUpperCase());
        setLines([]);
        
        const length = Math.min(MEMORY_CHUNK_SIZE, 0x10000 - addr);
        const request: MemoryRangeRequest = { start: addr, length };
        worker.postMessage({
            type: WORKER_MESSAGES.GET_MEMORY_RANGE,
            data: request
        });
    }, [worker]);

    // Navigate by actual rendered content
    const navigateUp = useCallback(() => {
        // Go back by approximately the same amount we're showing
        // Use average of 2 bytes per instruction as estimate
        const bytesToMove = Math.max(16, visibleRows * 2);
        const newAddr = Math.max(0, startAddress - bytesToMove);
        loadMemoryAt(newAddr);
    }, [startAddress, visibleRows, loadMemoryAt]);

    const navigateDown = useCallback(() => {
        // Move forward by the bytes consumed by actually rendered instructions
        if (renderedLines.length > 0) {
            const lastLine = renderedLines[renderedLines.length - 1];
            const nextAddr = lastLine.address + lastLine.bytes.length;
            loadMemoryAt(Math.min(0xFFFF, nextAddr));
        } else if (lines.length > 0) {
            // Fallback if renderedLines not set yet
            const visibleLines = lines.slice(0, visibleRows);
            const lastLine = visibleLines[visibleLines.length - 1];
            if (lastLine) {
                const nextAddr = lastLine.address + lastLine.bytes.length;
                loadMemoryAt(Math.min(0xFFFF, nextAddr));
            }
        }
    }, [renderedLines, lines, visibleRows, loadMemoryAt]);

    // Jump to PC
    const jumpToPC = useCallback(() => {
        if (currentPC !== undefined && currentPC >= 0) {
            loadMemoryAt(currentPC);
        }
    }, [currentPC, loadMemoryAt]);

    // Toggle breakpoint
    const toggleBreakpoint = useCallback((address: number) => {
        const newBreakpoints = new Set(breakpoints);
        if (newBreakpoints.has(address)) {
            newBreakpoints.delete(address);
            worker.postMessage({
                type: WORKER_MESSAGES.CLEAR_BREAKPOINT,
                data: address
            });
        } else {
            newBreakpoints.add(address);
            worker.postMessage({
                type: WORKER_MESSAGES.SET_BREAKPOINT,
                data: address
            });
        }
        setBreakpoints(newBreakpoints);
    }, [breakpoints, worker]);

    // Execution controls
    const handleStep = useCallback(() => {
        setExecutionState('stepping');
        worker.postMessage({ type: WORKER_MESSAGES.STEP });
        setTimeout(() => {
            setExecutionState('paused');
        }, 100);
    }, [worker]);

    const handleRunPause = useCallback(() => {
        if (isPaused) {
            worker.postMessage({ type: WORKER_MESSAGES.RESUME_EMULATION });
            setIsPaused(false);
            setExecutionState('running');
        } else {
            worker.postMessage({ type: WORKER_MESSAGES.PAUSE_EMULATION });
            setIsPaused(true);
            setExecutionState('paused');
        }
    }, [isPaused, worker]);

    const handleReset = useCallback(() => {
        worker.postMessage({ data: 'Tab', type: WORKER_MESSAGES.KEY_DOWN });
    }, [worker]);

    // Handle address input
    const handleAddressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setAddressInput(e.target.value.toUpperCase());
    }, []);

    const handleAddressSubmit = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const addr = parseInt(addressInput, 16);
            if (!isNaN(addr)) {
                loadMemoryAt(addr);
            }
        }
    }, [addressInput, loadMemoryAt]);

    // Listen for emulation status updates
    useEffect(() => {
        const handleMessage = (e: MessageEvent) => {
            if (e.data.type === WORKER_MESSAGES.EMULATION_STATUS) {
                const status = e.data.data;
                if (status === 'paused') {
                    setIsPaused(true);
                    setExecutionState('paused');
                } else {
                    setIsPaused(false);
                    setExecutionState('running');
                }
            }
        };

        worker.addEventListener('message', handleMessage);
        return () => worker.removeEventListener('message', handleMessage);
    }, [worker]);

    // Handle worker messages
    useEffect(() => {
        const handleWorkerMessage = (event: MessageEvent) => {
            if (event.data?.type === WORKER_MESSAGES.MEMORY_RANGE_DATA) {
                const memoryData = event.data.data as MemoryRangeData;
                const disassembly = disassembleMemory(memoryData.start, memoryData.data.length, memoryData.data);
                // Trim to exactly visible rows
                const trimmedLines = disassembly.slice(0, visibleRows);
                setLines(disassembly); // Keep full list for reference
                setRenderedLines(trimmedLines); // Track what we're actually showing
            }
            
            if (event.data?.type === WORKER_MESSAGES.DEBUG_DATA) {
                const debugData = event.data.data;
                if (debugData.cpu?.PC !== undefined) {
                    setCurrentPC(debugData.cpu.PC);
                }
            }
            
            if (event.data?.type === WORKER_MESSAGES.BREAKPOINTS_DATA) {
                const bpData = event.data.data as number[];
                setBreakpoints(new Set(bpData));
            }
            
            if (event.data?.type === WORKER_MESSAGES.BREAKPOINT_HIT) {
                const hitPC = event.data.data as number;
                loadMemoryAt(hitPC);
            }
        };

        worker.addEventListener('message', handleWorkerMessage);
        return () => worker.removeEventListener('message', handleWorkerMessage);
    }, [worker, disassembleMemory, loadMemoryAt, visibleRows]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't handle shortcuts if input is focused
            if (document.activeElement?.tagName === 'INPUT') return;
            
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                navigateUp();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                navigateDown();
            } else if ((e.key === 'F10' || (e.key === ' ' && e.target === document.body)) && isPaused) {
                e.preventDefault();
                handleStep();
            } else if (e.key === 'F5') {
                e.preventDefault();
                handleRunPause();
            } else if (e.key === 'F8') {
                e.preventDefault();
                jumpToPC();
            } else if (e.key === 'F9' && currentPC !== undefined) {
                e.preventDefault();
                toggleBreakpoint(currentPC);
            }
        };
        
        const handleMessage = (e: MessageEvent) => {
            if (e.data?.type === 'JUMP_TO_PC') {
                jumpToPC();
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('message', handleMessage);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('message', handleMessage);
        };
    }, [currentPC, isPaused, navigateUp, navigateDown, handleStep, handleRunPause, jumpToPC, toggleBreakpoint]);

    // Initial load and request breakpoints
    useEffect(() => {
        loadMemoryAt(0);
        worker.postMessage({ type: WORKER_MESSAGES.GET_BREAKPOINTS });
    }, [loadMemoryAt, worker]);

    // Calculate visible range based on what we're actually showing
    const endAddress = renderedLines.length > 0 
        ? renderedLines[renderedLines.length - 1].address + renderedLines[renderedLines.length - 1].bytes.length - 1
        : startAddress;

    return (
        <div ref={containerRef} className="h-full flex flex-col bg-surface-primary rounded-lg border border-border-primary">
            {/* Integrated controls header */}
            <div className="p-sm border-b border-border-subtle flex-shrink-0">
                <div className="flex flex-wrap items-center gap-sm">
                    {/* Memory Navigation */}
                    <div className="flex items-center gap-xs">
                        <label className="text-xs text-text-secondary">Addr:</label>
                        <input
                            type="text"
                            value={addressInput}
                            onChange={handleAddressChange}
                            onKeyDown={handleAddressSubmit}
                            className="bg-black/40 border border-border-primary text-data-address px-xs py-xxs w-16 font-mono text-xs rounded transition-colors focus:border-border-accent focus:outline-none"
                            placeholder="0000"
                            maxLength={4}
                        />
                        <div className="flex gap-xxs">
                            <button
                                onClick={navigateUp}
                                className="px-xs py-xxs text-xs bg-surface-secondary border border-border-primary rounded hover:bg-surface-hover"
                                title="Previous page (↑)"
                            >
                                ↑
                            </button>
                            <button
                                onClick={navigateDown}
                                className="px-xs py-xxs text-xs bg-surface-secondary border border-border-primary rounded hover:bg-surface-hover"
                                title="Next page (↓)"
                            >
                                ↓
                            </button>
                        </div>
                    </div>

                    <div className="h-4 w-px bg-border-subtle" />

                    {/* Execution Controls */}
                    <div className="flex items-center gap-xs">
                        <button
                            onClick={handleStep}
                            disabled={!isPaused}
                            className={`px-sm py-xxs text-xs font-medium rounded transition-all ${
                                isPaused
                                    ? 'bg-data-value/10 text-data-value hover:bg-data-value/20 border border-data-value/30'
                                    : 'bg-surface-secondary text-text-disabled cursor-not-allowed border border-border-subtle'
                            }`}
                            title="Step (F10)"
                        >
                            Step
                        </button>
                        
                        <button
                            onClick={handleRunPause}
                            className={`px-sm py-xxs text-xs font-medium rounded transition-all ${
                                isPaused
                                    ? 'bg-success/10 text-success hover:bg-success/20 border border-success/30'
                                    : 'bg-warning/10 text-warning hover:bg-warning/20 border border-warning/30'
                            }`}
                            title="Run/Pause (F5)"
                        >
                            {isPaused ? 'Run' : 'Pause'}
                        </button>
                        
                        <button
                            onClick={handleReset}
                            className="px-sm py-xxs text-xs font-medium rounded transition-all bg-error/10 text-error hover:bg-error/20 border border-error/30"
                            title="Reset (Tab)"
                        >
                            Reset
                        </button>
                        
                        <button
                            onClick={jumpToPC}
                            className="px-sm py-xxs text-xs font-medium rounded transition-all bg-data-address/10 text-data-address hover:bg-data-address/20 border border-data-address/30"
                            title="Jump to PC (F8)"
                        >
                            →PC
                        </button>
                    </div>

                    {/* Status and info */}
                    <div className="flex items-center gap-xs ml-auto">
                        <span className={`text-xs font-medium px-xs py-xxs rounded ${
                            executionState === 'running' 
                                ? 'bg-success/20 text-success' 
                                : executionState === 'paused'
                                ? 'bg-warning/20 text-warning'
                                : 'bg-data-value/20 text-data-value'
                        }`}>
                            {executionState.toUpperCase()}
                        </span>
                        {lines.length > 0 && (
                            <span className="text-xs text-text-secondary font-mono">
                                ${startAddress.toString(16).padStart(4, '0').toUpperCase()}-${endAddress.toString(16).padStart(4, '0').toUpperCase()}
                            </span>
                        )}
                        <span className="text-xs text-text-muted">
                            {visibleRows} rows
                        </span>
                    </div>
                </div>
                
                {/* Keyboard shortcuts help */}
                <div className="mt-xs text-xs text-text-muted">
                    ↑↓: Navigate • F10: Step • F5: Run/Pause • F8: Jump to PC • F9: Breakpoint
                </div>
            </div>

            {/* Disassembly table - No scroll, fixed height */}
            <div className="flex-1 bg-black/20 overflow-hidden">
                <table className="text-xs w-full font-mono table-fixed">
                    <thead className="bg-surface-secondary">
                        <tr className="text-text-accent">
                            <th className="text-left px-xs py-1 border-b border-border-subtle w-8">BP</th>
                            <th className="text-left px-sm py-1 border-b border-border-subtle w-20">Address</th>
                            <th className="text-left px-sm py-1 border-b border-border-subtle w-24">Bytes</th>
                            <th className="text-left px-sm py-1 border-b border-border-subtle">Instruction</th>
                        </tr>
                    </thead>
                    <tbody>
                        {renderedLines.map((line, index) => {
                            const isCurrentPC = line.address === currentPC;
                            const hasBreakpoint = breakpoints.has(line.address);
                            const addressHex = line.address.toString(16).padStart(4, '0').toUpperCase();
                            const bytesHex = line.bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
                            
                            return (
                                <tr
                                    key={`${line.address}-${index}`}
                                    ref={isCurrentPC ? pcRowRef : undefined}
                                    className={isCurrentPC 
                                        ? 'bg-warning/20 text-warning border-l-2 border-warning' 
                                        : 'hover:bg-surface-secondary/50 transition-colors'
                                    }
                                    style={{ height: '24px' }}
                                >
                                    <td 
                                        className="px-xs py-1 align-top cursor-pointer text-center"
                                        onClick={() => toggleBreakpoint(line.address)}
                                        title={hasBreakpoint ? "Remove breakpoint" : "Set breakpoint"}
                                    >
                                        <span className={`inline-block w-3 h-3 rounded-full ${
                                            hasBreakpoint 
                                                ? 'bg-error/80 border border-error' 
                                                : 'bg-transparent border border-border-subtle hover:border-error/50'
                                        }`}>
                                            {hasBreakpoint && <span className="text-[8px] leading-none block text-center">●</span>}
                                        </span>
                                    </td>
                                    <td className="px-sm py-1 text-data-address align-middle font-medium">
                                        {isCurrentPC && <span className="text-warning mr-1">▶</span>} 
                                        <span className="font-mono">${addressHex}</span>
                                    </td>
                                    <td className="px-sm py-1 text-data-value align-middle font-mono text-xs">
                                        {bytesHex}
                                    </td>
                                    <td className="px-sm py-1 align-middle">
                                        <span className="text-data-status font-medium">{line.instruction}</span>
                                        {line.operand && (
                                            <span className="text-data-value ml-1">{line.operand}</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {/* Fill empty rows to maintain consistent height */}
                        {Array.from({ length: Math.max(0, visibleRows - renderedLines.length) }, (_, i) => (
                            <tr key={`empty-${i}`}>
                                <td colSpan={4} className="py-1">&nbsp;</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DisassemblerPaginatedNoScroll;