import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WORKER_MESSAGES, MemoryRangeRequest, MemoryRangeData } from '../apple1/TSTypes';
import { OPCODES } from './Disassembler';

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

const DisassemblerPaginated: React.FC<DisassemblerProps> = ({ worker }) => {
    const [lines, setLines] = useState<DisassemblyLine[]>([]);
    const [currentPC, setCurrentPC] = useState<number>(0);
    const [startAddress, setStartAddress] = useState(0x0000);
    const [addressInput, setAddressInput] = useState('0000');
    const [breakpoints, setBreakpoints] = useState<Set<number>>(new Set());
    const [executionState, setExecutionState] = useState<ExecutionState>('running');
    const [isPaused, setIsPaused] = useState(false);
    
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const pcRowRef = useRef<HTMLTableRowElement>(null);
    
    // Fixed size for memory fetch - enough to fill a typical view
    const MEMORY_CHUNK_SIZE = 512; // bytes

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
                if (addr + i < 0x10000) {
                    bytes.push(memory[addr + i - startAddr] || 0);
                }
            }

            // Format operand based on addressing mode
            switch (opcodeInfo.mode) {
                case 'imp':
                case 'acc': {
                    operand = '';
                    break;
                }
                case 'imm': {
                    operand = `#$${bytes[1]?.toString(16).padStart(2, '0').toUpperCase() || '00'}`;
                    break;
                }
                case 'zp': {
                    operand = `$${bytes[1]?.toString(16).padStart(2, '0').toUpperCase() || '00'}`;
                    break;
                }
                case 'zpx': {
                    operand = `$${bytes[1]?.toString(16).padStart(2, '0').toUpperCase() || '00'},X`;
                    break;
                }
                case 'zpy': {
                    operand = `$${bytes[1]?.toString(16).padStart(2, '0').toUpperCase() || '00'},Y`;
                    break;
                }
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
                case 'izx': {
                    operand = `($${bytes[1]?.toString(16).padStart(2, '0').toUpperCase() || '00'},X)`;
                    break;
                }
                case 'izy': {
                    operand = `($${bytes[1]?.toString(16).padStart(2, '0').toUpperCase() || '00'}),Y`;
                    break;
                }
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

    // Load memory at address
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

    // Navigate up/down
    const navigateUp = useCallback(() => {
        const newAddr = Math.max(0, startAddress - MEMORY_CHUNK_SIZE);
        loadMemoryAt(newAddr);
        // Scroll to bottom when going up
        setTimeout(() => {
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
            }
        }, 50);
    }, [startAddress, loadMemoryAt]);

    const navigateDown = useCallback(() => {
        const newAddr = Math.min(0xFFFF - MEMORY_CHUNK_SIZE + 1, startAddress + MEMORY_CHUNK_SIZE);
        loadMemoryAt(newAddr);
        // Scroll to top when going down
        setTimeout(() => {
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTop = 0;
            }
        }, 50);
    }, [startAddress, loadMemoryAt]);

    // Jump to PC
    const jumpToPC = useCallback(() => {
        if (currentPC !== undefined && currentPC >= 0) {
            loadMemoryAt(currentPC);
            setTimeout(() => {
                pcRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 150);
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
                setLines(disassembly);
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
                // Jump to the breakpoint location
                loadMemoryAt(hitPC);
                setTimeout(() => {
                    pcRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }
        };

        worker.addEventListener('message', handleWorkerMessage);
        return () => worker.removeEventListener('message', handleWorkerMessage);
    }, [worker, disassembleMemory, loadMemoryAt]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Navigation
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                navigateUp();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                navigateDown();
            }
            // Execution controls
            else if ((e.key === 'F10' || (e.key === ' ' && e.target === document.body)) && isPaused) {
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

    // Calculate visible range
    const endAddress = lines.length > 0 
        ? lines[lines.length - 1].address + lines[lines.length - 1].bytes.length - 1
        : startAddress;

    return (
        <div className="h-full flex flex-col bg-surface-primary rounded-lg border border-border-primary">
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

                    {/* Status and range */}
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
                    </div>
                </div>
                
                {/* Keyboard shortcuts help */}
                <div className="mt-xs text-xs text-text-muted">
                    ↑↓: Navigate • F10: Step • F5: Run/Pause • F8: Jump to PC • F9: Breakpoint
                </div>
            </div>

            {/* Disassembly table */}
            <div ref={scrollContainerRef} className="flex-1 overflow-auto">
                <table className="text-xs border-t border-border-subtle w-full bg-black/20 font-mono table-auto">
                    <thead className="sticky top-0 z-10 bg-surface-secondary">
                        <tr className="text-text-accent">
                            <th className="text-left px-xs py-1 bg-surface-secondary border-b border-border-subtle w-8">BP</th>
                            <th className="text-left px-sm py-1 bg-surface-secondary border-b border-border-subtle">Address</th>
                            <th className="text-left px-sm py-1 bg-surface-secondary border-b border-border-subtle">Bytes</th>
                            <th className="text-left px-sm py-1 bg-surface-secondary border-b border-border-subtle">Instruction</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lines.map((line, index) => {
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
                                    <td className="px-sm py-1 text-data-address align-top font-medium">
                                        {isCurrentPC && <span className="text-warning mr-1">▶</span>} 
                                        <span className="font-mono">${addressHex}</span>
                                    </td>
                                    <td className="px-sm py-1 text-data-value align-top font-mono text-xs">
                                        {bytesHex}
                                    </td>
                                    <td className="px-sm py-1 align-top">
                                        <span className="text-data-status font-medium">{line.instruction}</span>
                                        {line.operand && (
                                            <span className="text-data-value ml-1">{line.operand}</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DisassemblerPaginated;