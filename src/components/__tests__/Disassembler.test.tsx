import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Disassembler, { OPCODES } from '../Disassembler';
import { WORKER_MESSAGES, MemoryRangeData } from '../../apple1/TSTypes';

interface MockControlsProps {
    address: string;
    onAddressChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onAddressSubmit: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

interface MockAddressLinkProps {
    address: number;
    className?: string;
    children?: React.ReactNode;
}

// Mock the CompactExecutionControls component
jest.mock('../CompactExecutionControls', () => ({
    __esModule: true,
    default: ({ address, onAddressChange, onAddressSubmit }: MockControlsProps) => (
        <div data-testid="compact-execution-controls">
            <input
                data-testid="address-input"
                value={address}
                onChange={onAddressChange}
                onKeyDown={onAddressSubmit}
            />
        </div>
    ),
}));

// Mock the AddressLink component
jest.mock('../AddressLink', () => ({
    __esModule: true,
    default: ({ address, className, children }: MockAddressLinkProps) => (
        <span data-testid={`address-link-${address}`} className={className}>
            ${address.toString(16).padStart(4, '0').toUpperCase()}
            {children}
        </span>
    ),
}));

describe('Disassembler', () => {
    let mockWorker: Worker;
    let mockPostMessage: jest.Mock;
    let mockAddEventListener: jest.Mock;
    let mockRemoveEventListener: jest.Mock;
    let messageHandlers: Map<string, (event: MessageEvent) => void>;

    beforeEach(() => {
        mockPostMessage = jest.fn();
        mockAddEventListener = jest.fn((event, handler) => {
            messageHandlers.set(event, handler);
        });
        mockRemoveEventListener = jest.fn((event) => {
            messageHandlers.delete(event);
        });
        messageHandlers = new Map();

        mockWorker = {
            postMessage: mockPostMessage,
            addEventListener: mockAddEventListener,
            removeEventListener: mockRemoveEventListener,
        } as unknown as Worker;

        // Prevent context menu during tests
        const originalAddEventListener = document.addEventListener;
        jest.spyOn(document, 'addEventListener').mockImplementation((event, handler, options) => {
            if (event === 'contextmenu') {
                return;
            }
            return originalAddEventListener.call(document, event, handler as EventListener, options);
        });
        jest.spyOn(document, 'removeEventListener').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    it('should render the disassembler component', () => {
        render(<Disassembler worker={mockWorker} />);
        
        expect(screen.getByText('Assembly Code')).toBeInTheDocument();
        expect(screen.getByTestId('compact-execution-controls')).toBeInTheDocument();
    });

    it('should request initial memory and breakpoints on mount', () => {
        render(<Disassembler worker={mockWorker} />);
        
        expect(mockPostMessage).toHaveBeenCalledWith({
            type: WORKER_MESSAGES.GET_MEMORY_RANGE,
            data: { start: 0, length: 4096 }
        });
        expect(mockPostMessage).toHaveBeenCalledWith({
            type: WORKER_MESSAGES.GET_BREAKPOINTS
        });
    });

    it('should handle memory range data and display disassembly', async () => {
        render(<Disassembler worker={mockWorker} />);
        
        const memoryData: MemoryRangeData = {
            start: 0x0000,
            data: [0xA9, 0x01, 0x85, 0x00, 0xEA] // LDA #$01, STA $00, NOP
        };
        
        const messageHandler = messageHandlers.get('message');
        if (messageHandler) {
            messageHandler(new MessageEvent('message', {
                data: { type: WORKER_MESSAGES.MEMORY_RANGE_DATA, data: memoryData }
            }));
        }
        
        await waitFor(() => {
            expect(screen.getByText('LDA')).toBeInTheDocument();
            expect(screen.getByText('STA')).toBeInTheDocument();
            expect(screen.getByText('NOP')).toBeInTheDocument();
        });
    });

    it('should handle address input and jump to address on Enter', () => {
        render(<Disassembler worker={mockWorker} />);
        
        const addressInput = screen.getByTestId('address-input') as HTMLInputElement;
        
        // Change address input
        fireEvent.change(addressInput, { target: { value: 'FF00' } });
        expect(addressInput.value).toBe('FF00');
        
        // Press Enter
        fireEvent.keyDown(addressInput, { key: 'Enter' });
        
        expect(mockPostMessage).toHaveBeenCalledWith({
            type: WORKER_MESSAGES.GET_MEMORY_RANGE,
            data: { start: 0xFF00, length: 256 }
        });
    });

    it('should handle invalid address input gracefully', () => {
        render(<Disassembler worker={mockWorker} />);
        
        const addressInput = screen.getByTestId('address-input') as HTMLInputElement;
        
        fireEvent.change(addressInput, { target: { value: 'INVALID' } });
        fireEvent.keyDown(addressInput, { key: 'Enter' });
        
        // Should not make additional calls for invalid address
        expect(mockPostMessage).toHaveBeenCalledTimes(2); // Initial + breakpoints only
    });

    it('should handle PC updates from debug data', async () => {
        render(<Disassembler worker={mockWorker} />);
        
        const messageHandler = messageHandlers.get('message');
        if (messageHandler) {
            messageHandler(new MessageEvent('message', {
                data: { 
                    type: WORKER_MESSAGES.DEBUG_DATA, 
                    data: { cpu: { PC: 0x1000 } }
                }
            }));
        }
        
        // Display some memory with the PC address
        const memoryData: MemoryRangeData = {
            start: 0x1000,
            data: [0xEA, 0xEA] // NOP, NOP
        };
        
        if (messageHandler) {
            messageHandler(new MessageEvent('message', {
                data: { type: WORKER_MESSAGES.MEMORY_RANGE_DATA, data: memoryData }
            }));
        }
        
        await waitFor(() => {
            // PC indicator should be shown
            expect(screen.getByText('▶')).toBeInTheDocument();
        });
    });

    it('should toggle breakpoints when clicking breakpoint column', async () => {
        render(<Disassembler worker={mockWorker} />);
        
        // Load some memory
        const memoryData: MemoryRangeData = {
            start: 0x0000,
            data: [0xEA] // NOP
        };
        
        const messageHandler = messageHandlers.get('message');
        if (messageHandler) {
            messageHandler(new MessageEvent('message', {
                data: { type: WORKER_MESSAGES.MEMORY_RANGE_DATA, data: memoryData }
            }));
        }
        
        await waitFor(() => {
            expect(screen.getByText('NOP')).toBeInTheDocument();
        });
        
        // Click on breakpoint column
        const bpCell = screen.getAllByTitle(/breakpoint/i)[0];
        fireEvent.click(bpCell);
        
        expect(mockPostMessage).toHaveBeenCalledWith({
            type: WORKER_MESSAGES.SET_BREAKPOINT,
            data: 0x0000
        });
    });

    it('should handle breakpoint data updates', async () => {
        render(<Disassembler worker={mockWorker} />);
        
        const messageHandler = messageHandlers.get('message');
        if (messageHandler) {
            // Send breakpoints data
            messageHandler(new MessageEvent('message', {
                data: { 
                    type: WORKER_MESSAGES.BREAKPOINTS_DATA, 
                    data: [0x1000, 0x2000]
                }
            }));
        }
        
        // Load memory that includes a breakpoint address
        const memoryData: MemoryRangeData = {
            start: 0x1000,
            data: [0xEA] // NOP
        };
        
        if (messageHandler) {
            messageHandler(new MessageEvent('message', {
                data: { type: WORKER_MESSAGES.MEMORY_RANGE_DATA, data: memoryData }
            }));
        }
        
        await waitFor(() => {
            // Should show breakpoint indicator
            const bpIndicator = screen.getByText('●');
            expect(bpIndicator).toBeInTheDocument();
        });
    });

    it('should handle breakpoint hit and jump to address', async () => {
        render(<Disassembler worker={mockWorker} />);
        
        const messageHandler = messageHandlers.get('message');
        if (messageHandler) {
            messageHandler(new MessageEvent('message', {
                data: { 
                    type: WORKER_MESSAGES.BREAKPOINT_HIT, 
                    data: 0x3000
                }
            }));
        }
        
        expect(mockPostMessage).toHaveBeenCalledWith({
            type: WORKER_MESSAGES.GET_MEMORY_RANGE,
            data: { start: 0x3000, length: 4096 }
        });
    });

    it('should handle keyboard shortcuts', async () => {
        render(<Disassembler worker={mockWorker} />);
        
        // F8 - Jump to PC
        fireEvent.keyDown(window, { key: 'F8' });
        // Should not crash when PC is 0
        
        // Set PC first
        const messageHandler = messageHandlers.get('message');
        if (messageHandler) {
            messageHandler(new MessageEvent('message', {
                data: { 
                    type: WORKER_MESSAGES.DEBUG_DATA, 
                    data: { cpu: { PC: 0x4000 } }
                }
            }));
        }
        
        // Wait for state update
        await waitFor(() => {
            // F8 - Jump to PC again
            fireEvent.keyDown(window, { key: 'F8' });
            
            // Check for the call with the specific parameters
            expect(mockPostMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: WORKER_MESSAGES.GET_MEMORY_RANGE,
                    data: expect.objectContaining({ start: 0x4000 })
                })
            );
        });
        
        // F9 - Toggle breakpoint at PC
        fireEvent.keyDown(window, { key: 'F9', preventDefault: jest.fn() });
        expect(mockPostMessage).toHaveBeenCalledWith({
            type: WORKER_MESSAGES.SET_BREAKPOINT,
            data: 0x4000
        });
        
        // F7 - Run to cursor at PC
        fireEvent.keyDown(window, { key: 'F7', preventDefault: jest.fn() });
        expect(mockPostMessage).toHaveBeenCalledWith({
            type: WORKER_MESSAGES.RUN_TO_ADDRESS,
            data: 0x4000
        });
    });

    it('should handle window messages for jump to PC', async () => {
        render(<Disassembler worker={mockWorker} />);
        
        // Set PC first
        const messageHandler = messageHandlers.get('message');
        if (messageHandler) {
            messageHandler(new MessageEvent('message', {
                data: { 
                    type: WORKER_MESSAGES.DEBUG_DATA, 
                    data: { cpu: { PC: 0x5000 } }
                }
            }));
        }
        
        await waitFor(() => {
            // Send window message
            window.postMessage({ type: 'JUMP_TO_PC' }, '*');
            
            // Process message
            fireEvent(window, new MessageEvent('message', {
                data: { type: 'JUMP_TO_PC' }
            }));
            
            expect(mockPostMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: WORKER_MESSAGES.GET_MEMORY_RANGE,
                    data: expect.objectContaining({ start: 0x5000 })
                })
            );
        });
    });

    it('should disassemble various instruction types correctly', async () => {
        const { container } = render(<Disassembler worker={mockWorker} />);
        
        const memoryData: MemoryRangeData = {
            start: 0x0000,
            data: [
                0xA9, 0x42,       // LDA #$42 (immediate)
                0x85, 0x00,       // STA $00 (zero page)
                0xBD, 0x00, 0x10, // LDA $1000,X (absolute,X)
                0x4C, 0x00, 0x20, // JMP $2000 (absolute)
                0xF0, 0x10,       // BEQ $xx (relative)
                0x6C, 0x00, 0x30, // JMP ($3000) (indirect)
                0xFF              // Invalid opcode
            ]
        };
        
        const messageHandler = messageHandlers.get('message');
        if (messageHandler) {
            messageHandler(new MessageEvent('message', {
                data: { type: WORKER_MESSAGES.MEMORY_RANGE_DATA, data: memoryData }
            }));
        }
        
        await waitFor(() => {
            const tableRows = container.querySelectorAll('tbody tr');
            expect(tableRows.length).toBeGreaterThan(0);
            
            // Check that instructions are displayed
            const instructionCells = container.querySelectorAll('tbody td:nth-child(4)');
            const instructions = Array.from(instructionCells).map(cell => cell.textContent);
            
            // Check for various instruction types
            expect(instructions.join(' ')).toContain('LDA');
            expect(instructions.join(' ')).toContain('STA');
            expect(instructions.join(' ')).toContain('JMP');
            expect(instructions.join(' ')).toContain('BEQ');
            expect(instructions.join(' ')).toContain('???'); // Invalid opcode
        });
    });

    it('should display instruction bytes correctly', async () => {
        render(<Disassembler worker={mockWorker} />);
        
        const memoryData: MemoryRangeData = {
            start: 0x0000,
            data: [0xA9, 0x42, 0x4C, 0x00, 0xFF]
        };
        
        const messageHandler = messageHandlers.get('message');
        if (messageHandler) {
            messageHandler(new MessageEvent('message', {
                data: { type: WORKER_MESSAGES.MEMORY_RANGE_DATA, data: memoryData }
            }));
        }
        
        await waitFor(() => {
            // Check byte display
            expect(screen.getByText('A9 42')).toBeInTheDocument();
            expect(screen.getByText('4C 00 FF')).toBeInTheDocument();
        });
    });

    it('should handle edge cases at memory boundaries', async () => {
        render(<Disassembler worker={mockWorker} />);
        
        // Memory at the very end of address space
        const memoryData: MemoryRangeData = {
            start: 0xFFFE,
            data: [0xA9, 0x42] // LDA #$42 at boundary
        };
        
        const messageHandler = messageHandlers.get('message');
        if (messageHandler) {
            messageHandler(new MessageEvent('message', {
                data: { type: WORKER_MESSAGES.MEMORY_RANGE_DATA, data: memoryData }
            }));
        }
        
        await waitFor(() => {
            expect(screen.getByText('LDA')).toBeInTheDocument();
        });
    });

    it('should remove breakpoints when clicked again', async () => {
        render(<Disassembler worker={mockWorker} />);
        
        // Set initial breakpoints
        const messageHandler = messageHandlers.get('message');
        if (messageHandler) {
            messageHandler(new MessageEvent('message', {
                data: { 
                    type: WORKER_MESSAGES.BREAKPOINTS_DATA, 
                    data: [0x0000]
                }
            }));
        }
        
        // Load memory
        const memoryData: MemoryRangeData = {
            start: 0x0000,
            data: [0xEA]
        };
        
        if (messageHandler) {
            messageHandler(new MessageEvent('message', {
                data: { type: WORKER_MESSAGES.MEMORY_RANGE_DATA, data: memoryData }
            }));
        }
        
        await waitFor(() => {
            expect(screen.getByText('●')).toBeInTheDocument();
        });
        
        // Click to remove breakpoint
        const bpCell = screen.getByTitle('Remove breakpoint');
        fireEvent.click(bpCell);
        
        expect(mockPostMessage).toHaveBeenCalledWith({
            type: WORKER_MESSAGES.CLEAR_BREAKPOINT,
            data: 0x0000
        });
    });

    it('should properly validate OPCODES table', () => {
        // Check that all opcodes have required properties
        Object.entries(OPCODES).forEach(([opcode, info]) => {
            const opcodeNum = parseInt(opcode);
            expect(opcodeNum).toBeGreaterThanOrEqual(0);
            expect(opcodeNum).toBeLessThanOrEqual(255);
            expect(info.name).toBeTruthy();
            expect(info.mode).toBeTruthy();
            expect(info.bytes).toBeGreaterThanOrEqual(1);
            expect(info.bytes).toBeLessThanOrEqual(3);
        });
    });

    it('should cleanup event listeners on unmount', () => {
        const { unmount } = render(<Disassembler worker={mockWorker} />);
        
        unmount();
        
        expect(mockRemoveEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    });

    it('should handle empty memory data', async () => {
        render(<Disassembler worker={mockWorker} />);
        
        const memoryData: MemoryRangeData = {
            start: 0x0000,
            data: []
        };
        
        const messageHandler = messageHandlers.get('message');
        if (messageHandler) {
            messageHandler(new MessageEvent('message', {
                data: { type: WORKER_MESSAGES.MEMORY_RANGE_DATA, data: memoryData }
            }));
        }
        
        // Should not crash
        expect(screen.getByText('Assembly Code')).toBeInTheDocument();
    });
});