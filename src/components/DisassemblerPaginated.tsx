import React, { useState, useEffect, useCallback, useRef } from 'react';
import '../apple1/TSTypes';
import { OPCODES } from '../constants/opcodes';
import PaginatedTableView from './PaginatedTableView';
import CompactCpuRegisters from './CompactCpuRegisters';
import AddressLink from './AddressLink';
import { Formatters } from '../utils/formatters';
import { useEmulation } from '../contexts/EmulationContext';
import { REFRESH_RATES } from '../constants/ui';
import type { WorkerManager } from '../services/WorkerManager';

interface DisassemblerProps {
    workerManager: WorkerManager;
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

const DisassemblerPaginated: React.FC<DisassemblerProps> = ({ 
    workerManager, 
    currentAddress: externalAddress, 
    onAddressChange 
}) => {
    const [lines, setLines] = useState<DisassemblyLine[]>([]);
    const [viewStartAddress, setViewStartAddress] = useState(0x0000);
    const [actualVisibleRows, setActualVisibleRows] = useState(16); // Track what's actually shown
    const [runToCursorTarget, setRunToCursorTarget] = useState<number | null>(null);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const rowCalculationInProgress = useRef(false);
    const pendingFetchAddress = useRef<number | null>(null);
    
    // Get emulation state from context
    const { 
        isPaused, 
        executionState, 
        currentPC, 
        debugInfo, 
        breakpoints,
        pause, 
        resume, 
        step: contextStep,
        toggleBreakpoint: contextToggleBreakpoint,
        subscribeToNavigationEvents
    } = useEmulation();
    
    // Calculate visible rows based on container height
    useEffect(() => {
        const calculateRows = () => {
            if (!contentRef.current || rowCalculationInProgress.current) return;
            
            // Mark calculation as in progress
            rowCalculationInProgress.current = true;
            
            const content = contentRef.current;
            
            window.requestAnimationFrame(() => {
                const table = content.querySelector('table');
                if (!table) {
                    rowCalculationInProgress.current = false;
                    return;
                }
                
                const thead = table.querySelector('thead') as HTMLElement;
                if (!thead) {
                    rowCalculationInProgress.current = false;
                    return;
                }
                
                // Measure actual row height if possible
                const tbody = table.querySelector('tbody');
                let actualRowHeight = 24; // Default row height
                
                if (tbody) {
                    const firstRow = tbody.querySelector('tr');
                    if (firstRow) {
                        const rowRect = firstRow.getBoundingClientRect();
                        actualRowHeight = rowRect.height || 24;
                    }
                }
                
                // Get actual measurements
                const contentRect = content.getBoundingClientRect();
                const theadRect = thead.getBoundingClientRect();
                
                // Available height for tbody
                const availableHeight = contentRect.height - theadRect.height;
                
                // Calculate rows
                const possibleRows = Math.floor(availableHeight / actualRowHeight);
                
                // Set visible rows with reasonable limits
                const calculatedRows = Math.max(10, Math.min(50, possibleRows));
                setActualVisibleRows(calculatedRows);
                
                // Mark calculation as complete
                rowCalculationInProgress.current = false;
                
                // If there's a pending fetch, trigger a re-render to process it
                if (pendingFetchAddress.current !== null) {
                    // The pending address will be processed by the viewStartAddress effect
                    // once rowCalculationInProgress is false
                    setViewStartAddress(prev => {
                        // If the pending address is different, use it
                        if (pendingFetchAddress.current !== null && pendingFetchAddress.current !== prev) {
                            const addr = pendingFetchAddress.current;
                            pendingFetchAddress.current = null;
                            return addr;
                        }
                        // Otherwise trigger the effect by returning the same value
                        return prev;
                    });
                }
            });
        };
        
        // Debounced resize handler to prevent rapid recalculations
        let resizeTimeout: ReturnType<typeof setTimeout>;
        const debouncedCalculateRows = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(calculateRows, 100);
        };
        
        // Initial calculation with proper delay
        const timer = setTimeout(calculateRows, 150);
        
        // Recalculate on resize with debouncing
        const resizeObserver = new ResizeObserver(debouncedCalculateRows);
        
        if (contentRef.current) {
            resizeObserver.observe(contentRef.current);
        }
        
        window.addEventListener('resize', debouncedCalculateRows);
        
        return () => {
            clearTimeout(timer);
            clearTimeout(resizeTimeout);
            resizeObserver.disconnect();
            window.removeEventListener('resize', debouncedCalculateRows);
        };
    }, []);
    
    // Disassemble memory
    const disassembleMemory = useCallback((startAddr: number, memory: Uint8Array): DisassemblyLine[] => {
        const result: DisassemblyLine[] = [];
        let addr = startAddr;
        let memIndex = 0;
        const maxLines = 100; // Safety limit to prevent runaway loops
        
        while (memIndex < memory.length && addr <= 0xFFFF && result.length < maxLines) {
            const opcode = memory[memIndex];
            const opcodeInfo = OPCODES[opcode];
            
            if (!opcodeInfo) {
                result.push({
                    address: addr,
                    bytes: [opcode],
                    instruction: '???',
                    operand: `$${Formatters.hex(opcode, 2)}`,
                });
                addr++;
                memIndex++;
                continue;
            }

            const bytes: number[] = [opcode];
            let operand = '';
            let operandAddress: number | undefined;
            let operandType: 'absolute' | 'branch' | 'zeropage' | undefined;
            
            // Get operand bytes
            for (let i = 1; i < opcodeInfo.bytes; i++) {
                if (memIndex + i < memory.length) {
                    bytes.push(memory[memIndex + i]);
                }
            }

            // Format operand based on addressing mode
            switch (opcodeInfo.mode) {
                case 'imp':
                case 'acc':
                    break;
                case 'imm':
                    operand = `#$${Formatters.hex(bytes[1] ?? 0, 2)}`;
                    break;
                case 'zp':
                    operandAddress = bytes[1] || 0;
                    operandType = 'zeropage';
                    operand = `$${Formatters.hex(operandAddress, 2)}`;
                    break;
                case 'zpx':
                    operand = `$${Formatters.hex(bytes[1] ?? 0, 2)},X`;
                    break;
                case 'zpy':
                    operand = `$${Formatters.hex(bytes[1] ?? 0, 2)},Y`;
                    break;
                case 'abs':
                    operandAddress = (bytes[2] || 0) << 8 | (bytes[1] || 0);
                    operandType = 'absolute';
                    operand = `$${Formatters.hex(operandAddress, 4)}`;
                    break;
                case 'abx':
                    operandAddress = (bytes[2] || 0) << 8 | (bytes[1] || 0);
                    operandType = 'absolute';
                    operand = `$${Formatters.hex(operandAddress, 4)},X`;
                    break;
                case 'aby':
                    operandAddress = (bytes[2] || 0) << 8 | (bytes[1] || 0);
                    operandType = 'absolute';
                    operand = `$${Formatters.hex(operandAddress, 4)},Y`;
                    break;
                case 'ind':
                    operandAddress = (bytes[2] || 0) << 8 | (bytes[1] || 0);
                    operandType = 'absolute';
                    operand = `($${Formatters.hex(operandAddress, 4)})`;
                    break;
                case 'izx':
                    operand = `($${Formatters.hex(bytes[1] ?? 0, 2)},X)`;
                    break;
                case 'izy':
                    operand = `($${Formatters.hex(bytes[1] ?? 0, 2)}),Y`;
                    break;
                case 'rel': {
                    const offset = bytes[1] || 0;
                    const target = addr + 2 + (offset > 127 ? offset - 256 : offset);
                    operandAddress = target & 0xFFFF;
                    operandType = 'branch';
                    operand = `$${Formatters.hex(operandAddress, 4)}`;
                    break;
                }
            }

            result.push({
                address: addr,
                bytes,
                instruction: opcodeInfo.name,
                ...(operand && { operand }),
                ...(operandAddress !== undefined && { operandAddress }),
                ...(operandType !== undefined && { operandType })
            });

            addr += opcodeInfo.bytes;
            memIndex += opcodeInfo.bytes;
        }
        
        return result;
    }, []);
    
    // Fetch and disassemble memory for current view
    const fetchAndDisassemble = useCallback(async (startAddr: number) => {
        // Sanity check - don't fetch beyond memory bounds
        if (startAddr > 0xFFFF) {
            setLines([]);
            return;
        }
        
        const targetRows = actualVisibleRows;
        
        // Special handling for addresses near the end of memory
        // We need to ensure we can show a full page
        if (startAddr > 0xFFFF - (targetRows * 3)) {
            // Near the end - fetch backwards to fill the view
            
            // Fetch more than we need and work backwards
            const fetchStart = Math.max(0, startAddr - (targetRows * 3));
            const fetchSize = 0x10000 - fetchStart;
            
            try {
                const memoryData = await workerManager.readMemoryRange(fetchStart, fetchSize);
                if (memoryData) {
                    const allLines = disassembleMemory(fetchStart, new Uint8Array(memoryData));
                    
                    // Find the line that starts at or after our target address
                    let startIdx = 0;
                    for (let i = 0; i < allLines.length; i++) {
                        if (allLines[i].address >= startAddr) {
                            startIdx = i;
                            break;
                        }
                    }
                    
                    // Take targetRows from that point, or whatever is available
                    const finalLines = allLines.slice(startIdx, startIdx + targetRows);
                    
                    // If we don't have enough lines to fill the view, adjust start
                    if (finalLines.length < targetRows && startIdx > 0) {
                        // Move start back to get more lines
                        const needed = targetRows - finalLines.length;
                        const newStartIdx = Math.max(0, startIdx - needed);
                        setLines(allLines.slice(newStartIdx, newStartIdx + targetRows));
                        // Update view start to match what we're showing
                        if (allLines[newStartIdx]) {
                            setViewStartAddress(allLines[newStartIdx].address);
                        }
                    } else {
                        setLines(finalLines);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch memory:', error);
            }
            return;
        }
        
        // Normal case - fetch forward
        try {
            // Fetch enough to guarantee we get targetRows instructions
            const bytesToFetch = Math.min(targetRows * 4, 0x10000 - startAddr);
            const memoryData = await workerManager.readMemoryRange(startAddr, bytesToFetch);
            if (memoryData) {
                const disassembly = disassembleMemory(startAddr, new Uint8Array(memoryData));
                // Take exactly the target number of rows
                setLines(disassembly.slice(0, targetRows));
            }
        } catch (error) {
            console.error('Failed to fetch memory:', error);
        }
    }, [workerManager, disassembleMemory, actualVisibleRows]);
    
    // Fetch data when view address or visible rows change
    useEffect(() => {
        // If row calculation is in progress, store the address for later
        if (rowCalculationInProgress.current) {
            pendingFetchAddress.current = viewStartAddress;
            return;
        }
        
        fetchAndDisassemble(viewStartAddress);
    }, [viewStartAddress, fetchAndDisassemble]);
    
    // Navigation function
    const navigateTo = useCallback((address: number) => {
        // Clamp address to valid range
        const clampedAddr = Math.max(0, Math.min(0xFFFF, address));
        setViewStartAddress(clampedAddr);
        onAddressChange?.(clampedAddr);
    }, [onAddressChange]);
    
    // Subscribe to navigation events for auto-follow
    useEffect(() => {
        const unsubscribe = subscribeToNavigationEvents((event) => {
            // Navigate to show the address with some context
            const targetAddr = Math.max(0, event.address - 5);
            navigateTo(targetAddr);
        });
        
        return unsubscribe;
    }, [subscribeToNavigationEvents, navigateTo]);
    
    // Handle external address changes (e.g., from breakpoints)
    useEffect(() => {
        if (externalAddress !== undefined && externalAddress !== viewStartAddress) {
            navigateTo(externalAddress);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [externalAddress]); // Intentionally not including viewStartAddress to avoid loops
    
    // Subscribe to run-to-cursor updates
    useEffect(() => {
        let unsubscribe: (() => void) | undefined;
        
        const setupRunToCursorUpdates = async () => {
            const result = await workerManager.onRunToCursorTarget((target) => {
                setRunToCursorTarget(target);
            });
            if (result) {
                unsubscribe = result;
            }
        };
        
        setupRunToCursorUpdates();
        
        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [workerManager]);
    
    // Request debug info periodically when paused
    useEffect(() => {
        if (!isPaused) return;
        
        const requestDebugInfo = async () => {
            await workerManager.getDebugInfo();
        };
        
        requestDebugInfo();
        const interval = setInterval(requestDebugInfo, REFRESH_RATES.FAST);
        return () => clearInterval(interval);
    }, [workerManager, isPaused]);
    
    // Navigation handlers
    const handleNavigateUp = useCallback(() => {
        if (lines.length === 0 || viewStartAddress === 0) return;
        
        // To navigate up consistently, we need to fetch backwards and find
        // the right starting point to show a full page
        const targetRows = actualVisibleRows;
        
        // Fetch enough bytes backwards to guarantee we can show a full page
        const fetchStart = Math.max(0, viewStartAddress - (targetRows * 3));
        const fetchSize = viewStartAddress - fetchStart;
        
        if (fetchSize <= 0) {
            navigateTo(0);
            return;
        }
        
        workerManager.readMemoryRange(fetchStart, fetchSize).then(memoryData => {
            if (memoryData) {
                const allLines = disassembleMemory(fetchStart, new Uint8Array(memoryData));
                
                // Find the right starting line to show exactly targetRows
                // ending just before our current view
                let bestStartIdx = 0;
                for (let i = 0; i < allLines.length; i++) {
                    const slice = allLines.slice(i, i + targetRows);
                    if (slice.length >= targetRows) {
                        const lastInSlice = slice[slice.length - 1];
                        // Check if this slice would end just before our current view
                        if (lastInSlice.address + lastInSlice.bytes.length <= viewStartAddress) {
                            bestStartIdx = i;
                        } else {
                            break;
                        }
                    }
                }
                
                if (allLines[bestStartIdx]) {
                    navigateTo(allLines[bestStartIdx].address);
                }
            }
        }).catch(error => {
            console.error('Failed to navigate up:', error);
        });
    }, [viewStartAddress, actualVisibleRows, navigateTo, disassembleMemory, workerManager, lines.length]);
    
    const handleNavigateDown = useCallback(() => {
        if (lines.length === 0) return;
        
        // Navigate by a full page worth of content
        // Use the last visible line's address as the new start
        const lastLine = lines[lines.length - 1];
        if (lastLine) {
            // Start the next view right after the last visible instruction
            const nextAddr = lastLine.address + lastLine.bytes.length;
            
            // Check if we're at the end of memory
            if (nextAddr > 0xFFFF) {
                // Can't scroll past the end
                return;
            }
            
            navigateTo(nextAddr);
        }
    }, [lines, navigateTo]);
    
    // Jump to PC
    const jumpToPC = useCallback(() => {
        if (currentPC !== undefined) {
            navigateTo(Math.max(0, currentPC - 5));
        }
    }, [currentPC, navigateTo]);
    
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

    const handleReset = useCallback(async () => {
        await workerManager.keyDown('Tab');
    }, [workerManager]);
    
    // Get instruction info
    const getInstructionInfo = (line: DisassemblyLine): string => {
        const opcode = line.bytes[0];
        const opcodeInfo = OPCODES[opcode];
        
        if (!opcodeInfo) return '';
        
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
        
        let info = modeNames[opcodeInfo.mode] || opcodeInfo.mode;
        
        // Add special hints
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
    
    // Render functions
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
            const isCurrentPC = currentPC !== undefined && line.address === currentPC;
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
                        onClick={() => contextToggleBreakpoint(line.address)}
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
                            workerManager={workerManager}
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
                        {line.operand && (
                            <span className="ml-2">
                                {line.operandAddress !== undefined ? (
                                    <AddressLink 
                                        address={line.operandAddress} 
                                        format={line.operandType === 'zeropage' ? 'hex2' : 'hex4'}
                                        className="text-data-value"
                                        workerManager={workerManager}
                                        showContextMenu={true}
                                        showRunToCursor={true}
                                    />
                                ) : (
                                    <span className="text-data-value">{line.operand}</span>
                                )}
                            </span>
                        )}
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
    
    // Calculate address range for display
    const getAddressRange = () => {
        if (lines.length === 0) {
            const start = Formatters.hex(viewStartAddress, 4);
            return `$${start}-$${start}`;
        }
        
        const start = Formatters.hex(lines[0].address, 4);
        const lastLine = lines[lines.length - 1];
        const end = Formatters.hex(lastLine.address, 4);
        return `$${start}-$${end}`;
    };
    
    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
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
                contextToggleBreakpoint(currentPC);
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentPC, isPaused, handleStep, handleRunPause, jumpToPC, contextToggleBreakpoint]);
    
    return (
        <div className="flex flex-col h-full">
            {isPaused && (
                <CompactCpuRegisters debugInfo={debugInfo} workerManager={workerManager} />
            )}
            
            <div className="flex-1">
                <PaginatedTableView
                    currentAddress={viewStartAddress}
                    onAddressChange={navigateTo}
                    onNavigateUp={handleNavigateUp}
                    onNavigateDown={handleNavigateDown}
                    addressRange={getAddressRange()}
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