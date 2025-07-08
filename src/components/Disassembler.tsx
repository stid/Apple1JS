import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WORKER_MESSAGES, MemoryRangeRequest, MemoryRangeData } from '../apple1/TSTypes';
import CompactExecutionControls from './CompactExecutionControls';
import AddressLink from './AddressLink';
import { Formatters } from '../utils/formatters';

interface DisassemblerProps {
    worker: Worker;
}

interface DisassemblyLine {
    address: number;
    bytes: number[];
    instruction: string;
    operand?: string;
    operandAddress?: number;  // Parsed address from operand for jumps/branches
}

// 6502 opcode definitions for disassembly
export const OPCODES: Record<number, { name: string; mode: string; bytes: number }> = {
    0x00: { name: 'BRK', mode: 'imp', bytes: 1 },
    0x01: { name: 'ORA', mode: 'izx', bytes: 2 },
    0x05: { name: 'ORA', mode: 'zp', bytes: 2 },
    0x06: { name: 'ASL', mode: 'zp', bytes: 2 },
    0x08: { name: 'PHP', mode: 'imp', bytes: 1 },
    0x09: { name: 'ORA', mode: 'imm', bytes: 2 },
    0x0A: { name: 'ASL', mode: 'acc', bytes: 1 },
    0x0D: { name: 'ORA', mode: 'abs', bytes: 3 },
    0x0E: { name: 'ASL', mode: 'abs', bytes: 3 },
    0x10: { name: 'BPL', mode: 'rel', bytes: 2 },
    0x11: { name: 'ORA', mode: 'izy', bytes: 2 },
    0x15: { name: 'ORA', mode: 'zpx', bytes: 2 },
    0x16: { name: 'ASL', mode: 'zpx', bytes: 2 },
    0x18: { name: 'CLC', mode: 'imp', bytes: 1 },
    0x19: { name: 'ORA', mode: 'aby', bytes: 3 },
    0x1D: { name: 'ORA', mode: 'abx', bytes: 3 },
    0x1E: { name: 'ASL', mode: 'abx', bytes: 3 },
    0x20: { name: 'JSR', mode: 'abs', bytes: 3 },
    0x21: { name: 'AND', mode: 'izx', bytes: 2 },
    0x24: { name: 'BIT', mode: 'zp', bytes: 2 },
    0x25: { name: 'AND', mode: 'zp', bytes: 2 },
    0x26: { name: 'ROL', mode: 'zp', bytes: 2 },
    0x28: { name: 'PLP', mode: 'imp', bytes: 1 },
    0x29: { name: 'AND', mode: 'imm', bytes: 2 },
    0x2A: { name: 'ROL', mode: 'acc', bytes: 1 },
    0x2C: { name: 'BIT', mode: 'abs', bytes: 3 },
    0x2D: { name: 'AND', mode: 'abs', bytes: 3 },
    0x2E: { name: 'ROL', mode: 'abs', bytes: 3 },
    0x30: { name: 'BMI', mode: 'rel', bytes: 2 },
    0x31: { name: 'AND', mode: 'izy', bytes: 2 },
    0x35: { name: 'AND', mode: 'zpx', bytes: 2 },
    0x36: { name: 'ROL', mode: 'zpx', bytes: 2 },
    0x38: { name: 'SEC', mode: 'imp', bytes: 1 },
    0x39: { name: 'AND', mode: 'aby', bytes: 3 },
    0x3D: { name: 'AND', mode: 'abx', bytes: 3 },
    0x3E: { name: 'ROL', mode: 'abx', bytes: 3 },
    0x40: { name: 'RTI', mode: 'imp', bytes: 1 },
    0x41: { name: 'EOR', mode: 'izx', bytes: 2 },
    0x45: { name: 'EOR', mode: 'zp', bytes: 2 },
    0x46: { name: 'LSR', mode: 'zp', bytes: 2 },
    0x48: { name: 'PHA', mode: 'imp', bytes: 1 },
    0x49: { name: 'EOR', mode: 'imm', bytes: 2 },
    0x4A: { name: 'LSR', mode: 'acc', bytes: 1 },
    0x4C: { name: 'JMP', mode: 'abs', bytes: 3 },
    0x4D: { name: 'EOR', mode: 'abs', bytes: 3 },
    0x4E: { name: 'LSR', mode: 'abs', bytes: 3 },
    0x50: { name: 'BVC', mode: 'rel', bytes: 2 },
    0x51: { name: 'EOR', mode: 'izy', bytes: 2 },
    0x55: { name: 'EOR', mode: 'zpx', bytes: 2 },
    0x56: { name: 'LSR', mode: 'zpx', bytes: 2 },
    0x58: { name: 'CLI', mode: 'imp', bytes: 1 },
    0x59: { name: 'EOR', mode: 'aby', bytes: 3 },
    0x5D: { name: 'EOR', mode: 'abx', bytes: 3 },
    0x5E: { name: 'LSR', mode: 'abx', bytes: 3 },
    0x60: { name: 'RTS', mode: 'imp', bytes: 1 },
    0x61: { name: 'ADC', mode: 'izx', bytes: 2 },
    0x65: { name: 'ADC', mode: 'zp', bytes: 2 },
    0x66: { name: 'ROR', mode: 'zp', bytes: 2 },
    0x68: { name: 'PLA', mode: 'imp', bytes: 1 },
    0x69: { name: 'ADC', mode: 'imm', bytes: 2 },
    0x6A: { name: 'ROR', mode: 'acc', bytes: 1 },
    0x6C: { name: 'JMP', mode: 'ind', bytes: 3 },
    0x6D: { name: 'ADC', mode: 'abs', bytes: 3 },
    0x6E: { name: 'ROR', mode: 'abs', bytes: 3 },
    0x70: { name: 'BVS', mode: 'rel', bytes: 2 },
    0x71: { name: 'ADC', mode: 'izy', bytes: 2 },
    0x75: { name: 'ADC', mode: 'zpx', bytes: 2 },
    0x76: { name: 'ROR', mode: 'zpx', bytes: 2 },
    0x78: { name: 'SEI', mode: 'imp', bytes: 1 },
    0x79: { name: 'ADC', mode: 'aby', bytes: 3 },
    0x7D: { name: 'ADC', mode: 'abx', bytes: 3 },
    0x7E: { name: 'ROR', mode: 'abx', bytes: 3 },
    0x81: { name: 'STA', mode: 'izx', bytes: 2 },
    0x84: { name: 'STY', mode: 'zp', bytes: 2 },
    0x85: { name: 'STA', mode: 'zp', bytes: 2 },
    0x86: { name: 'STX', mode: 'zp', bytes: 2 },
    0x88: { name: 'DEY', mode: 'imp', bytes: 1 },
    0x8A: { name: 'TXA', mode: 'imp', bytes: 1 },
    0x8C: { name: 'STY', mode: 'abs', bytes: 3 },
    0x8D: { name: 'STA', mode: 'abs', bytes: 3 },
    0x8E: { name: 'STX', mode: 'abs', bytes: 3 },
    0x90: { name: 'BCC', mode: 'rel', bytes: 2 },
    0x91: { name: 'STA', mode: 'izy', bytes: 2 },
    0x94: { name: 'STY', mode: 'zpx', bytes: 2 },
    0x95: { name: 'STA', mode: 'zpx', bytes: 2 },
    0x96: { name: 'STX', mode: 'zpy', bytes: 2 },
    0x98: { name: 'TYA', mode: 'imp', bytes: 1 },
    0x99: { name: 'STA', mode: 'aby', bytes: 3 },
    0x9A: { name: 'TXS', mode: 'imp', bytes: 1 },
    0x9D: { name: 'STA', mode: 'abx', bytes: 3 },
    0xA0: { name: 'LDY', mode: 'imm', bytes: 2 },
    0xA1: { name: 'LDA', mode: 'izx', bytes: 2 },
    0xA2: { name: 'LDX', mode: 'imm', bytes: 2 },
    0xA4: { name: 'LDY', mode: 'zp', bytes: 2 },
    0xA5: { name: 'LDA', mode: 'zp', bytes: 2 },
    0xA6: { name: 'LDX', mode: 'zp', bytes: 2 },
    0xA8: { name: 'TAY', mode: 'imp', bytes: 1 },
    0xA9: { name: 'LDA', mode: 'imm', bytes: 2 },
    0xAA: { name: 'TAX', mode: 'imp', bytes: 1 },
    0xAC: { name: 'LDY', mode: 'abs', bytes: 3 },
    0xAD: { name: 'LDA', mode: 'abs', bytes: 3 },
    0xAE: { name: 'LDX', mode: 'abs', bytes: 3 },
    0xB0: { name: 'BCS', mode: 'rel', bytes: 2 },
    0xB1: { name: 'LDA', mode: 'izy', bytes: 2 },
    0xB4: { name: 'LDY', mode: 'zpx', bytes: 2 },
    0xB5: { name: 'LDA', mode: 'zpx', bytes: 2 },
    0xB6: { name: 'LDX', mode: 'zpy', bytes: 2 },
    0xB8: { name: 'CLV', mode: 'imp', bytes: 1 },
    0xB9: { name: 'LDA', mode: 'aby', bytes: 3 },
    0xBA: { name: 'TSX', mode: 'imp', bytes: 1 },
    0xBC: { name: 'LDY', mode: 'abx', bytes: 3 },
    0xBD: { name: 'LDA', mode: 'abx', bytes: 3 },
    0xBE: { name: 'LDX', mode: 'aby', bytes: 3 },
    0xC0: { name: 'CPY', mode: 'imm', bytes: 2 },
    0xC1: { name: 'CMP', mode: 'izx', bytes: 2 },
    0xC4: { name: 'CPY', mode: 'zp', bytes: 2 },
    0xC5: { name: 'CMP', mode: 'zp', bytes: 2 },
    0xC6: { name: 'DEC', mode: 'zp', bytes: 2 },
    0xC8: { name: 'INY', mode: 'imp', bytes: 1 },
    0xC9: { name: 'CMP', mode: 'imm', bytes: 2 },
    0xCA: { name: 'DEX', mode: 'imp', bytes: 1 },
    0xCC: { name: 'CPY', mode: 'abs', bytes: 3 },
    0xCD: { name: 'CMP', mode: 'abs', bytes: 3 },
    0xCE: { name: 'DEC', mode: 'abs', bytes: 3 },
    0xD0: { name: 'BNE', mode: 'rel', bytes: 2 },
    0xD1: { name: 'CMP', mode: 'izy', bytes: 2 },
    0xD5: { name: 'CMP', mode: 'zpx', bytes: 2 },
    0xD6: { name: 'DEC', mode: 'zpx', bytes: 2 },
    0xD8: { name: 'CLD', mode: 'imp', bytes: 1 },
    0xD9: { name: 'CMP', mode: 'aby', bytes: 3 },
    0xDD: { name: 'CMP', mode: 'abx', bytes: 3 },
    0xDE: { name: 'DEC', mode: 'abx', bytes: 3 },
    0xE0: { name: 'CPX', mode: 'imm', bytes: 2 },
    0xE1: { name: 'SBC', mode: 'izx', bytes: 2 },
    0xE4: { name: 'CPX', mode: 'zp', bytes: 2 },
    0xE5: { name: 'SBC', mode: 'zp', bytes: 2 },
    0xE6: { name: 'INC', mode: 'zp', bytes: 2 },
    0xE8: { name: 'INX', mode: 'imp', bytes: 1 },
    0xE9: { name: 'SBC', mode: 'imm', bytes: 2 },
    0xEA: { name: 'NOP', mode: 'imp', bytes: 1 },
    0xEC: { name: 'CPX', mode: 'abs', bytes: 3 },
    0xED: { name: 'SBC', mode: 'abs', bytes: 3 },
    0xEE: { name: 'INC', mode: 'abs', bytes: 3 },
    0xF0: { name: 'BEQ', mode: 'rel', bytes: 2 },
    0xF1: { name: 'SBC', mode: 'izy', bytes: 2 },
    0xF5: { name: 'SBC', mode: 'zpx', bytes: 2 },
    0xF6: { name: 'INC', mode: 'zpx', bytes: 2 },
    0xF8: { name: 'SED', mode: 'imp', bytes: 1 },
    0xF9: { name: 'SBC', mode: 'aby', bytes: 3 },
    0xFD: { name: 'SBC', mode: 'abx', bytes: 3 },
    0xFE: { name: 'INC', mode: 'abx', bytes: 3 },
};

const Disassembler: React.FC<DisassemblerProps> = ({ worker }) => {
    const [lines, setLines] = useState<DisassemblyLine[]>([]);
    const [currentPC, setCurrentPC] = useState<number>(0);
    const [inputAddress, setInputAddress] = useState<string>('0000');
    const [breakpoints, setBreakpoints] = useState<Set<number>>(new Set());
    
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const pcRowRef = useRef<HTMLTableRowElement>(null);

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
                if (addr + i < 0x10000) {
                    bytes.push(memory[addr + i - startAddr] || 0);
                }
            }

            // Format operand based on addressing mode
            let operandAddress: number | undefined;
            
            switch (opcodeInfo.mode) {
                case 'imp':
                case 'acc': {
                    operand = '';
                    break;
                }
                case 'imm': {
                    operand = `#$${Formatters.hex(bytes[1] ?? 0, 2)}`;
                    break;
                }
                case 'zp': {
                    operand = `$${Formatters.hex(bytes[1] ?? 0, 2)}`;
                    break;
                }
                case 'zpx': {
                    operand = `$${Formatters.hex(bytes[1] ?? 0, 2)},X`;
                    break;
                }
                case 'zpy': {
                    operand = `$${Formatters.hex(bytes[1] ?? 0, 2)},Y`;
                    break;
                }
                case 'abs': {
                    const absAddr = (bytes[2] || 0) << 8 | (bytes[1] || 0);
                    operand = `$${Formatters.hex(absAddr, 4)}`;
                    // Store address for JSR, JMP instructions
                    if (opcodeInfo.name === 'JSR' || opcodeInfo.name === 'JMP') {
                        operandAddress = absAddr;
                    }
                    break;
                }
                case 'abx': {
                    const abxAddr = (bytes[2] || 0) << 8 | (bytes[1] || 0);
                    operand = `$${Formatters.hex(abxAddr, 4)},X`;
                    break;
                }
                case 'aby': {
                    const abyAddr = (bytes[2] || 0) << 8 | (bytes[1] || 0);
                    operand = `$${Formatters.hex(abyAddr, 4)},Y`;
                    break;
                }
                case 'ind': {
                    const indAddr = (bytes[2] || 0) << 8 | (bytes[1] || 0);
                    operand = `($${Formatters.hex(indAddr, 4)})`;
                    if (opcodeInfo.name === 'JMP') {
                        operandAddress = indAddr;
                    }
                    break;
                }
                case 'izx': {
                    operand = `($${Formatters.hex(bytes[1] ?? 0, 2)},X)`;
                    break;
                }
                case 'izy': {
                    operand = `($${Formatters.hex(bytes[1] ?? 0, 2)}),Y`;
                    break;
                }
                case 'rel': {
                    const offset = bytes[1] || 0;
                    const target = addr + 2 + (offset > 127 ? offset - 256 : offset);
                    operand = `$${Formatters.hex(target, 4)}`;
                    // All relative addressing instructions are branches
                    operandAddress = target;
                    break;
                }
            }

            result.push({
                address: addr,
                bytes: bytes,
                instruction: opcodeInfo.name,
                operand: operand,
                ...(operandAddress !== undefined && { operandAddress }),
            });

            addr += opcodeInfo.bytes;
        }
        
        return result;
    }, []);

    // Jump to a specific address - load 4KB window
    const jumpToAddress = useCallback((addr: number) => {
        if (addr < 0 || addr > 0xFFFF) return;
        
        setLines([]);
        
        // Load 4KB chunk (4096 bytes) for good coverage
        const length = Math.min(4096, 0x10000 - addr);
        const request: MemoryRangeRequest = { start: addr, length };
        worker.postMessage({
            type: WORKER_MESSAGES.GET_MEMORY_RANGE,
            data: request
        });
    }, [worker]);

    // Handle input field changes
    const handleAddressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setInputAddress(e.target.value.toUpperCase());
    }, []);

    // Handle Enter key to jump to address
    const handleAddressSubmit = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const addr = parseInt(inputAddress, 16);
            if (!isNaN(addr)) {
                jumpToAddress(addr);
            }
        }
    }, [inputAddress, jumpToAddress]);

    // Toggle breakpoint at address
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
                jumpToAddress(hitPC);
                setTimeout(() => {
                    pcRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }
        };

        worker.addEventListener('message', handleWorkerMessage);
        return () => worker.removeEventListener('message', handleWorkerMessage);
    }, [worker, disassembleMemory, jumpToAddress]);

    // Initial load and request breakpoints
    useEffect(() => {
        jumpToAddress(0);
        worker.postMessage({ type: WORKER_MESSAGES.GET_BREAKPOINTS });
    }, [jumpToAddress, worker]);
    
    // Jump to PC function
    const jumpToPC = useCallback(() => {
        if (currentPC !== undefined && currentPC >= 0) {
            jumpToAddress(currentPC);
            // Scroll to PC after jump
            setTimeout(() => {
                pcRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 150);
        }
    }, [currentPC, jumpToAddress]);
    
    // Run to cursor for selected line
    const runToCursor = useCallback((address: number) => {
        if (worker) {
            worker.postMessage({
                type: WORKER_MESSAGES.RUN_TO_ADDRESS,
                data: address
            });
        }
    }, [worker]);

    // Keyboard shortcuts and window messages
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F9' && currentPC !== undefined) {
                e.preventDefault();
                toggleBreakpoint(currentPC);
            } else if (e.key === 'F8') {
                e.preventDefault();
                jumpToPC();
            } else if (e.key === 'F7' && currentPC !== undefined) {
                // F7 - Run to cursor at current PC
                e.preventDefault();
                runToCursor(currentPC);
            }
        };
        
        const handleMessage = (e: MessageEvent) => {
            if (e.data?.type === 'JUMP_TO_PC') {
                jumpToPC();
            }
        };
        
        // Prevent default context menu on the entire component
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            return false;
        };
        
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('message', handleMessage);
        document.addEventListener('contextmenu', handleContextMenu, true);
        
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('message', handleMessage);
            document.removeEventListener('contextmenu', handleContextMenu, true);
        };
    }, [currentPC, toggleBreakpoint, jumpToPC, runToCursor]);

    return (
        <div className="h-full flex flex-col overflow-auto space-y-md">
            {/* Combined Navigation & Execution Controls */}
            <CompactExecutionControls 
                worker={worker}
                address={inputAddress}
                onAddressChange={handleAddressChange}
                onAddressSubmit={handleAddressSubmit}
            />

            {/* Disassembly Section */}
            <section className="bg-surface-primary rounded-lg border border-border-primary flex-1 flex flex-col min-h-0">
                <div className="p-md border-b border-border-subtle flex-shrink-0">
                    <h3 className="text-sm font-medium text-text-accent flex items-center">
                        <span className="mr-2">📜</span>
                        Assembly Code
                        {lines.length > 0 && (
                            <span className="text-text-secondary text-xs ml-auto font-normal">
                                <span className="text-data-address font-mono">
                                    ${Formatters.hex(lines[0].address, 4)}
                                </span>
                                {' - '}
                                <span className="text-data-address font-mono">
                                    ${Formatters.hex(lines[lines.length - 1].address + lines[lines.length - 1].bytes.length - 1, 4)}
                                </span>
                                {' '}({lines.length} instructions)
                            </span>
                        )}
                    </h3>
                </div>
                <div 
                    ref={scrollContainerRef}
                    className="overflow-auto p-md flex-1"
                >
                    <table className="text-xs border border-border-subtle rounded w-full bg-black/20 font-mono table-auto">
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
                                const bytesHex = line.bytes.map(b => Formatters.hex(b, 2)).join(' ');
                                
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
                                        <td className="px-sm py-1 text-data-value align-top font-mono text-xs">
                                            {bytesHex}
                                        </td>
                                        <td className="px-sm py-1 align-top">
                                            <span className="text-data-status font-medium">{line.instruction}</span>
                                            {line.operand && (
                                                line.operandAddress !== undefined ? (
                                                    <span className="ml-1">
                                                        <AddressLink
                                                            address={line.operandAddress}
                                                            format="hex4"
                                                            prefix="$"
                                                            worker={worker}
                                                            showContextMenu={true}
                                                            showRunToCursor={true}
                                                            className="text-data-value"
                                                        />
                                                    </span>
                                                ) : (
                                                    <span className="text-data-value ml-1">{line.operand}</span>
                                                )
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default Disassembler;