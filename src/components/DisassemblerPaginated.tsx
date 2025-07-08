import React, { useState, useEffect, useCallback } from 'react';
import { WORKER_MESSAGES, MemoryRangeRequest, MemoryRangeData } from '../apple1/TSTypes';
import { OPCODES } from './Disassembler';
import PaginatedTableView from './PaginatedTableView';
import { usePaginatedTable } from '../hooks/usePaginatedTable';
import { useNavigableComponent } from '../hooks/useNavigableComponent';
import CompactCpuRegisters from './CompactCpuRegisters';
import AddressLink from './AddressLink';
import { Formatters } from '../utils/formatters';
import { useEmulation } from '../contexts/EmulationContext';
import { REFRESH_RATES } from '../constants/ui';

interface DisassemblerProps {
    worker: Worker;
    currentAddress?: number;
    onAddressChange?: (address: number) => void;
}

interface DisassemblyLine {
    address: number;
    bytes: number[];
    instruction: string;
    operand?: string;
    operandAddress?: number;
    operandType?: 'absolute' | 'branch' | 'zeropage';
}


const DisassemblerPaginated: React.FC<DisassemblerProps> = ({ worker, currentAddress: externalAddress, onAddressChange }) => {
    const [lines, setLines] = useState<DisassemblyLine[]>([]);
    const [runToCursorTarget, setRunToCursorTarget] = useState<number | null>(null);
    
    // Get emulation state from context
    const { 
        isPaused, 
        executionState, 
        currentPC: contextPC, 
        debugInfo, 
        breakpoints: contextBreakpoints,
        pause, 
        resume, 
        step: contextStep,
        toggleBreakpoint: contextToggleBreakpoint 
    } = useEmulation();
    
    // Use context values
    const currentPC = contextPC;
    const breakpoints = contextBreakpoints;
    
    // We fetch more than needed to ensure we have enough instructions
    const MEMORY_CHUNK_SIZE = 512;
    
    // Use navigation hook for external sync
    const { currentAddress: syncedAddress, navigateInternal } = useNavigableComponent({
        initialAddress: externalAddress ?? 0x0000,
        ...(onAddressChange !== undefined && { onAddressChange })
    });
    
    // Use the pagination hook for internal mechanics
    const {
        currentAddress,
        visibleRows,
        navigateTo: paginatedNavigateTo,
        containerRef,
        contentRef,
        getAddressRange
    } = usePaginatedTable({
        initialAddress: syncedAddress,
        bytesPerRow: 1, // Not really used for disassembly
        rowHeight: 24, // Same as memory viewer
        onDataRequest: (addr) => {
            // Request memory for disassembly
            const length = Math.min(MEMORY_CHUNK_SIZE, 0x10000 - addr);
            const request: MemoryRangeRequest = { start: addr, length };
            worker.postMessage({
                type: WORKER_MESSAGES.GET_MEMORY_RANGE,
                data: request
            });
        }
    });
    
    // Wrapper to use internal navigation
    const navigateTo = useCallback((address: number) => {
        paginatedNavigateTo(address);
        navigateInternal(address);
    }, [paginatedNavigateTo, navigateInternal]);
    
    // Disassemble memory
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
                    operand: `$${Formatters.hex(opcode, 2)}`,
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
                    operand = `#$${Formatters.hex(bytes[1] ?? 0, 2)}`;
                    break;
                case 'zp': {
                    const zpAddr = bytes[1] || 0;
                    operand = `$${Formatters.hex(zpAddr, 2)}`;
                    result.push({
                        address: addr,
                        bytes: bytes,
                        instruction: opcodeInfo.name,
                        operand: operand,
                        operandAddress: zpAddr,
                        operandType: 'zeropage'
                    });
                    addr += opcodeInfo.bytes;
                    continue;
                }
                case 'zpx':
                    operand = `$${Formatters.hex(bytes[1] ?? 0, 2)},X`;
                    break;
                case 'zpy':
                    operand = `$${Formatters.hex(bytes[1] ?? 0, 2)},Y`;
                    break;
                case 'abs': {
                    const absAddr = (bytes[2] || 0) << 8 | (bytes[1] || 0);
                    operand = `$${Formatters.hex(absAddr, 4)}`;
                    result.push({
                        address: addr,
                        bytes: bytes,
                        instruction: opcodeInfo.name,
                        operand: operand,
                        operandAddress: absAddr,
                        operandType: 'absolute'
                    });
                    addr += opcodeInfo.bytes;
                    continue;
                }
                case 'abx': {
                    const abxAddr = (bytes[2] || 0) << 8 | (bytes[1] || 0);
                    operand = `$${Formatters.hex(abxAddr, 4)},X`;
                    result.push({
                        address: addr,
                        bytes: bytes,
                        instruction: opcodeInfo.name,
                        operand: operand,
                        operandAddress: abxAddr,
                        operandType: 'absolute'
                    });
                    addr += opcodeInfo.bytes;
                    continue;
                }
                case 'aby': {
                    const abyAddr = (bytes[2] || 0) << 8 | (bytes[1] || 0);
                    operand = `$${Formatters.hex(abyAddr, 4)},Y`;
                    result.push({
                        address: addr,
                        bytes: bytes,
                        instruction: opcodeInfo.name,
                        operand: operand,
                        operandAddress: abyAddr,
                        operandType: 'absolute'
                    });
                    addr += opcodeInfo.bytes;
                    continue;
                }
                case 'ind': {
                    const indAddr = (bytes[2] || 0) << 8 | (bytes[1] || 0);
                    operand = `($${Formatters.hex(indAddr, 4)})`;
                    result.push({
                        address: addr,
                        bytes: bytes,
                        instruction: opcodeInfo.name,
                        operand: operand,
                        operandAddress: indAddr,
                        operandType: 'absolute'
                    });
                    addr += opcodeInfo.bytes;
                    continue;
                }
                case 'izx':
                    operand = `($${Formatters.hex(bytes[1] ?? 0, 2)},X)`;
                    break;
                case 'izy':
                    operand = `($${Formatters.hex(bytes[1] ?? 0, 2)}),Y`;
                    break;
                case 'rel': {
                    const offset = bytes[1] || 0;
                    const target = addr + 2 + (offset > 127 ? offset - 256 : offset);
                    operand = `$${Formatters.hex(target, 4)}`;
                    result.push({
                        address: addr,
                        bytes: bytes,
                        instruction: opcodeInfo.name,
                        operand: operand,
                        operandAddress: target,
                        operandType: 'branch'
                    });
                    addr += opcodeInfo.bytes;
                    continue;
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
    
    // Handle worker messages
    useEffect(() => {
        const handleWorkerMessage = (event: MessageEvent) => {
            if (event.data?.type === WORKER_MESSAGES.MEMORY_RANGE_DATA) {
                const memoryData = event.data.data as MemoryRangeData;
                const disassembly = disassembleMemory(memoryData.start, memoryData.data.length, memoryData.data);
                // Trim to visible rows
                const trimmedLines = disassembly.slice(0, visibleRows);
                setLines(trimmedLines);
            }
            
            // DEBUG_DATA is now handled by EmulationContext
            
            // Breakpoints are now provided by EmulationContext
            
            // Breakpoint hits are now handled by EmulationContext
            
            // DEBUG_INFO is now handled by EmulationContext
            
            if (event.data?.type === WORKER_MESSAGES.RUN_TO_CURSOR_TARGET) {
                // Update run-to-cursor target address
                const target = event.data.data as number | null;
                setRunToCursorTarget(target);
            }
        };

        worker.addEventListener('message', handleWorkerMessage);
        return () => worker.removeEventListener('message', handleWorkerMessage);
    }, [worker, disassembleMemory, navigateTo, visibleRows, executionState, lines, currentAddress]);
    
    // No longer need to listen for emulation status - handled by EmulationContext
    
    // Track previous PC to detect changes
    const [previousPC, setPreviousPC] = useState<number | null>(null);
    
    // Auto-follow PC when it changes (e.g., during stepping)
    useEffect(() => {
        if (currentPC !== previousPC && currentPC !== undefined && isPaused) {
            setPreviousPC(currentPC);
            
            // Check if PC is visible in current view
            const firstVisibleAddr = lines[0]?.address;
            const lastVisibleAddr = lines[lines.length - 1]?.address;
            
            if (firstVisibleAddr !== undefined && lastVisibleAddr !== undefined &&
                (currentPC < firstVisibleAddr || currentPC > lastVisibleAddr)) {
                // PC is not visible, navigate to it
                navigateTo(currentPC);
            }
        }
    }, [currentPC, previousPC, isPaused, lines, navigateTo]);
    
    // Sync with navigation hook address
    useEffect(() => {
        if (syncedAddress !== currentAddress) {
            paginatedNavigateTo(syncedAddress);
        }
    }, [syncedAddress, currentAddress, paginatedNavigateTo]);
    
    // Initial load and request breakpoints
    useEffect(() => {
        // Navigate to the external address if provided
        if (externalAddress !== undefined) {
            navigateTo(externalAddress);
        }
        // Breakpoints are now managed by EmulationContext
    }, [navigateTo, worker, externalAddress]);
    
    // Request debug info periodically - but only when paused (for register display)
    useEffect(() => {
        if (!isPaused) return; // Only request when paused
        
        const interval = setInterval(() => {
            worker.postMessage({ type: WORKER_MESSAGES.DEBUG_INFO, data: '' });
        }, REFRESH_RATES.FAST);
        return () => clearInterval(interval);
    }, [worker, isPaused]);
    
    // Navigation overrides for instruction-aware navigation
    const handleNavigateUp = useCallback(() => {
        // Go back by approximately the same amount we're showing
        // Use average of 2 bytes per instruction as estimate
        const bytesToMove = Math.max(16, visibleRows * 2);
        const newAddr = Math.max(0, currentAddress - bytesToMove);
        navigateTo(newAddr);
    }, [currentAddress, visibleRows, navigateTo]);
    
    const handleNavigateDown = useCallback(() => {
        // Move forward by the bytes consumed by actually rendered instructions
        if (lines.length > 0) {
            const lastLine = lines[lines.length - 1];
            const nextAddr = lastLine.address + lastLine.bytes.length;
            navigateTo(Math.min(0xFFFF, nextAddr));
        }
    }, [lines, navigateTo]);
    
    // Jump to PC
    const jumpToPC = useCallback(() => {
        if (currentPC !== undefined && currentPC >= 0) {
            navigateTo(currentPC);
        }
    }, [currentPC, navigateTo]);
    
    // Use toggleBreakpoint from context
    const toggleBreakpoint = contextToggleBreakpoint;
    
    // Execution controls
    const handleStep = useCallback(() => {
        contextStep();
    }, [contextStep]);

    const handleRunPause = useCallback(() => {
        if (isPaused) {
            resume();
        } else {
            pause();
        }
    }, [isPaused, pause, resume]);

    const handleReset = useCallback(() => {
        worker.postMessage({ data: 'Tab', type: WORKER_MESSAGES.KEY_DOWN });
    }, [worker]);
    
    // Calculate end address based on actual instructions
    const endAddress = lines.length > 0 
        ? lines[lines.length - 1].address + lines[lines.length - 1].bytes.length - 1
        : currentAddress;
    
    // Get instruction info/hints
    const getInstructionInfo = (line: DisassemblyLine): string => {
        const opcode = line.bytes[0];
        const opcodeInfo = OPCODES[opcode];
        
        if (!opcodeInfo) return '';
        
        let info = '';
        
        // Add addressing mode hint
        const modeNames: Record<string, string> = {
            'imp': 'Implied',
            'acc': 'Accumulator',
            'imm': 'Immediate',
            'zp': 'Zero Page',
            'zpx': 'Zero Page,X',
            'zpy': 'Zero Page,Y',
            'abs': 'Absolute',
            'abx': 'Absolute,X',
            'aby': 'Absolute,Y',
            'ind': 'Indirect',
            'izx': '(Indirect,X)',
            'izy': '(Indirect),Y',
            'rel': 'Relative'
        };
        
        info = modeNames[opcodeInfo.mode] || opcodeInfo.mode;
        
        // Add special hints for certain instructions
        if (line.instruction === 'BRK') {
            info += ' • Software interrupt';
        } else if (line.instruction === 'RTS') {
            info += ' • Return from subroutine';
        } else if (line.instruction === 'RTI') {
            info += ' • Return from interrupt';
        } else if (line.instruction === 'JSR') {
            info += ' • Call subroutine';
        } else if (line.instruction === 'JMP') {
            info += ' • Jump to address';
        } else if (line.instruction.startsWith('B') && line.instruction !== 'BIT' && line.instruction !== 'BRK') {
            // Branch instructions
            const branchConditions: Record<string, string> = {
                'BCC': 'if carry clear',
                'BCS': 'if carry set',
                'BEQ': 'if equal (Z=1)',
                'BMI': 'if minus (N=1)',
                'BNE': 'if not equal (Z=0)',
                'BPL': 'if plus (N=0)',
                'BVC': 'if overflow clear',
                'BVS': 'if overflow set'
            };
            const condition = branchConditions[line.instruction];
            if (condition) {
                info += ` • Branch ${condition}`;
            }
        }
        
        return info;
    };
    
    // Render functions for the table
    const renderTableHeader = () => (
        <thead className="bg-surface-secondary">
            <tr className="text-text-accent">
                <th className="text-left px-xs py-1 border-b border-border-subtle w-8">BP</th>
                <th className="text-left px-sm py-1 border-b border-border-subtle w-20">Address</th>
                <th className="text-left px-sm py-1 border-b border-border-subtle w-28">Bytes</th>
                <th className="text-left px-sm py-1 border-b border-border-subtle w-48">Instruction</th>
                <th className="text-left px-sm py-1 border-b border-border-subtle">Info</th>
            </tr>
        </thead>
    );
    
    const renderTableRows = () => {
        return lines.map((line, index) => {
            const isCurrentPC = line.address === currentPC;
            const hasBreakpoint = breakpoints.has(line.address);
            const isRunToCursor = line.address === runToCursorTarget;
            const bytesHex = line.bytes.map(b => Formatters.hex(b, 2)).join(' ');
            
            return (
                <tr
                    key={`${line.address}-${index}`}
                    className={isCurrentPC 
                        ? 'bg-warning/20 text-warning border-l-2 border-warning' 
                        : 'hover:bg-surface-secondary/50 transition-colors'
                    }
                    style={{ height: '24px' }}
                >
                    <td 
                        className="px-xs py-1 align-middle cursor-pointer text-center"
                        onClick={() => toggleBreakpoint(line.address)}
                        title={
                            isRunToCursor ? "Run-to-cursor target" :
                            hasBreakpoint ? "Remove breakpoint" : 
                            "Set breakpoint"
                        }
                    >
                        <span className={`inline-block w-3 h-3 rounded-full ${
                            isRunToCursor 
                                ? 'bg-warning/80 border border-warning animate-pulse' 
                                : hasBreakpoint 
                                    ? 'bg-error/80 border border-error' 
                                    : 'bg-transparent border border-border-subtle hover:border-error/50'
                        }`}>
                            {(hasBreakpoint || isRunToCursor) && <span className="text-[8px] leading-none block text-center">●</span>}
                        </span>
                    </td>
                    <td className="px-sm py-1 text-data-address align-middle font-medium">
                        {isCurrentPC && <span className="text-warning mr-1">▶</span>} 
                        <AddressLink
                            address={line.address}
                            format="hex4"
                            prefix="$"
                            worker={worker}
                            showContextMenu={true}
                            showRunToCursor={true}
                            className="font-mono"
                        />
                    </td>
                    <td className="px-sm py-1 text-data-value align-middle font-mono text-xs w-28">
                        {bytesHex.padEnd(8, ' ')}
                    </td>
                    <td className="px-sm py-1 align-middle w-48">
                        <span className="text-data-status font-medium">{line.instruction}</span>
                        {line.operand && line.operandAddress !== undefined ? (
                            <span className="ml-2">
                                {/* Handle different operand display formats */}
                                {line.operand.startsWith('(') ? (
                                    // Indirect addressing: ($XXXX)
                                    <>
                                        <span className="text-data-value">(</span>
                                        <AddressLink 
                                            address={line.operandAddress} 
                                            className="text-data-value hover:text-data-value-hover"
                                            worker={worker}
                                            showContextMenu={true}
                                            showRunToCursor={true}
                                        />
                                        <span className="text-data-value">)</span>
                                    </>
                                ) : line.operand.includes(',') ? (
                                    // Indexed addressing: $XXXX,X or $XXXX,Y
                                    <>
                                        <AddressLink 
                                            address={line.operandAddress} 
                                            format={line.operandType === 'zeropage' ? 'hex2' : 'hex4'}
                                            className="text-data-value hover:text-data-value-hover"
                                            worker={worker}
                                            showContextMenu={true}
                                            showRunToCursor={true}
                                        />
                                        <span className="text-data-value">{line.operand.slice(line.operand.indexOf(','))}</span>
                                    </>
                                ) : (
                                    // Simple absolute or branch addressing
                                    <AddressLink 
                                        address={line.operandAddress} 
                                        format={line.operandType === 'zeropage' ? 'hex2' : 'hex4'}
                                        className="text-data-value"
                                        worker={worker}
                                        showContextMenu={true}
                                        showRunToCursor={true}
                                    />
                                )}
                            </span>
                        ) : line.operand ? (
                            <span className="text-data-value ml-2">{line.operand}</span>
                        ) : null}
                    </td>
                    <td className="px-sm py-1 align-middle text-text-secondary text-xs">
                        {getInstructionInfo(line)}
                    </td>
                </tr>
            );
        });
    };
    
    const renderExtraControls = () => (
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
    );
    
    const renderStatusInfo = () => (
        <span className={`text-xs font-medium px-xs py-xxs rounded ${
            executionState === 'running' 
                ? 'bg-success/20 text-success' 
                : executionState === 'paused'
                ? 'bg-warning/20 text-warning'
                : 'bg-data-value/20 text-data-value'
        }`}>
            {executionState.toUpperCase()}
        </span>
    );
    
    // Custom address range display for disassembly
    const getCustomAddressRange = () => {
        if (lines.length === 0) return getAddressRange();
        return `$${Formatters.hex(currentAddress, 4)}-$${Formatters.hex(endAddress, 4)}`;
    };
    
    // Keyboard shortcuts - handled separately due to complexity
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't handle shortcuts if input is focused
            if (document.activeElement?.tagName === 'INPUT') return;
            
            if ((e.key === 'F10' || (e.key === ' ' && e.target === document.body)) && isPaused) {
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
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentPC, isPaused, handleStep, handleRunPause, jumpToPC, toggleBreakpoint]);
    
    return (
        <div className="flex flex-col h-full">
            {/* Compact CPU Registers - only show when paused/stepping */}
            {isPaused && (
                <CompactCpuRegisters debugInfo={debugInfo} worker={worker} />
            )}
            
            {/* Disassembler Table */}
            <div className="flex-1">
                <PaginatedTableView
                    currentAddress={currentAddress}
                    onAddressChange={navigateTo}
                    onNavigateUp={handleNavigateUp}
                    onNavigateDown={handleNavigateDown}
                    addressRange={getCustomAddressRange()}
                    rowCount={lines.length}
                    renderTableHeader={renderTableHeader}
                    renderTableRows={renderTableRows}
                    renderExtraControls={renderExtraControls}
                    renderStatusInfo={renderStatusInfo}
                    keyboardShortcuts="↑↓: Navigate • F10: Step • F5: Run/Pause • F8: Jump to PC • F9: Breakpoint"
                    containerRef={containerRef}
                    contentRef={contentRef}
                />
            </div>
        </div>
    );
};

export default DisassemblerPaginated;