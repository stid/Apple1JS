import React, { useState, useEffect, useCallback } from 'react';
import { WORKER_MESSAGES, MemoryRangeRequest, MemoryRangeData } from '../apple1/TSTypes';

interface DisassemblerProps {
    worker: Worker;
}

interface DisassemblyLine {
    address: number;
    bytes: number[];
    instruction: string;
    operand?: string;
    comment?: string;
}

// 6502 opcode definitions for disassembly
const OPCODES: Record<number, { name: string; mode: string; bytes: number }> = {
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
    const [startAddress, setStartAddress] = useState<string>('FF00');
    const [lines, setLines] = useState<DisassemblyLine[]>([]);
    const [currentPC, setCurrentPC] = useState<number>(0);

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

    const handleAddressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newAddress = e.target.value.toUpperCase();
        setStartAddress(newAddress);
        
        // Auto-disassemble when address changes and is valid
        const addr = parseInt(newAddress, 16);
        if (!isNaN(addr) && addr >= 0 && addr <= 0xFFFF && newAddress.length >= 1) {
            const request: MemoryRangeRequest = { start: addr, length: 256 };
            worker.postMessage({
                type: WORKER_MESSAGES.GET_MEMORY_RANGE,
                data: request
            });
        }
    }, [worker]);

    const handleInitialDisassemble = useCallback(() => {
        const addr = parseInt(startAddress, 16);
        if (isNaN(addr) || addr < 0 || addr > 0xFFFF) {
            return;
        }

        // Request memory data from worker
        const request: MemoryRangeRequest = { start: addr, length: 256 };
        worker.postMessage({
            type: WORKER_MESSAGES.GET_MEMORY_RANGE,
            data: request
        });
    }, [startAddress, worker]);

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
        };

        worker.addEventListener('message', handleWorkerMessage);
        return () => worker.removeEventListener('message', handleWorkerMessage);
    }, [worker, disassembleMemory]);

    // Auto-disassemble on mount
    useEffect(() => {
        handleInitialDisassemble();
    }, [handleInitialDisassemble]);

    return (
        <div className="flex flex-col lg:h-full lg:overflow-hidden">
            <div className="flex-none p-4 bg-black border-b border-slate-800">
                <div className="flex gap-2 items-center">
                    <label className="text-green-400">Address:</label>
                    <input
                        type="text"
                        value={startAddress}
                        onChange={handleAddressChange}
                        className="bg-black border border-green-700 text-green-300 px-2 py-1 w-20 font-mono"
                        placeholder="FF00"
                        maxLength={4}
                    />
                </div>
            </div>

            <div className="lg:flex-1 lg:overflow-auto bg-black border-t border-slate-800 rounded-xl px-4 py-4">
                <table className="text-xs border border-neutral-700 rounded w-full bg-neutral-950 text-green-300 font-mono">
                    <thead className="lg:sticky lg:top-0 lg:z-10 bg-neutral-800">
                        <tr className="text-green-200">
                            <th className="text-left px-2 py-1 bg-neutral-800">Address</th>
                            <th className="text-left px-2 py-1 bg-neutral-800">Bytes</th>
                            <th className="text-left px-2 py-1 bg-neutral-800">Instruction</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lines.map((line, index) => (
                            <tr
                                key={index}
                                className={`transition-colors duration-100 ${
                                    line.address === currentPC
                                        ? 'bg-yellow-600/30 text-yellow-100'
                                        : 'hover:bg-green-950/40'
                                }`}
                            >
                                <td className="px-2 py-1 text-green-400 align-top">
                                    {line.address === currentPC && '►'} 
                                    ${line.address.toString(16).padStart(4, '0').toUpperCase()}
                                </td>
                                <td className="px-2 py-1 text-green-300 align-top font-mono">
                                    {line.bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')}
                                </td>
                                <td className="px-2 py-1 align-top">
                                    <span className="text-cyan-300">{line.instruction}</span>
                                    {line.operand && (
                                        <span className="text-green-300 ml-1">{line.operand}</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Disassembler;