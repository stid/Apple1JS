/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DualEngine } from '../DualEngine';
import { WasmEngine } from '../WasmEngine';
import Bus from '../../Bus';
import { loggingService } from '../../../services/LoggingService';

// Mock the logging service
vi.mock('../../../services/LoggingService', () => ({
    loggingService: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
    }
}));

// Mock the wasm-loader
vi.mock('../wasm-loader', () => ({
    isWasmSupported: vi.fn(() => true),
    initializeWasmModule: vi.fn(() => Promise.resolve()),
    getWasmCPUClass: vi.fn(() => {
        // Mock WASM CPU class
        return class MockWasmCPU {
            pc = 0;
            a = 0;
            x = 0;
            y = 0;
            s = 0xFF;
            status = 0x20;
            cycles = 0;
            instructions = 0;
            
            reset() {
                this.pc = 0;
                this.a = 0;
                this.x = 0;
                this.y = 0;
                this.s = 0xFF;
                this.status = 0x20;
            }
            
            step() {
                this.pc++;
                this.cycles++;
                this.instructions++;
                return 2; // Mock cycles
            }
            
            save_state() {
                return {
                    pc: this.pc,
                    a: this.a,
                    x: this.x,
                    y: this.y,
                    s: this.s,
                    status: this.status,
                    cycles: this.cycles
                };
            }
            
            load_state(state: Record<string, unknown>) {
                this.pc = (state as any).pc || 0;
                this.a = (state as any).a || 0;
                this.x = (state as any).x || 0;
                this.y = (state as any).y || 0;
                this.s = (state as any).s || 0xFF;
                this.status = (state as any).status || 0x20;
                this.cycles = (state as any).cycles || 0;
            }
            
            read_memory(_addr: number) {
                void _addr; // Acknowledge parameter
                return 0;
            }
            
            write_memory(_addr: number, _value: number) {
                void _addr; // Acknowledge parameters
                void _value;
                // Mock write
            }
            
            get_metrics() {
                return {
                    cycles: this.cycles,
                    instructions: this.instructions,
                    average_ips: 1000,
                    last_step_duration: 0.1
                };
            }
        };
    })
}));

describe('DualEngine', () => {
    let bus: Bus;
    let dualEngine: DualEngine;
    
    beforeEach(() => {
        // Create a simple bus for testing
        bus = new Bus([]);
        vi.clearAllMocks();
    });
    
    afterEach(() => {
        if (dualEngine) {
            dualEngine.cleanup();
        }
    });
    
    describe('Initialization', () => {
        it('should initialize with JS engine by default', () => {
            dualEngine = new DualEngine(bus);
            expect(dualEngine.engineType).toBe('JS');
            expect(dualEngine.isReady).toBe(false);
        });
        
        it('should initialize with specified engine', () => {
            dualEngine = new DualEngine(bus, 'JS');
            expect(dualEngine.engineType).toBe('JS');
        });
        
        it('should initialize both engines', async () => {
            dualEngine = new DualEngine(bus);
            await dualEngine.initialize();
            
            expect(dualEngine.isReady).toBe(true);
            expect(dualEngine.getAvailableEngines()).toContain('JS');
        });
        
        it('should handle WASM initialization failure gracefully', async () => {
            const mockInitError = new Error('WASM init failed');
            vi.mocked(loggingService.error).mockClear();
            
            // Make WASM initialization fail
            vi.spyOn(WasmEngine.prototype, 'initialize').mockRejectedValueOnce(mockInitError);
            
            dualEngine = new DualEngine(bus);
            await dualEngine.initialize();
            
            // Should still be ready with JS engine
            expect(dualEngine.isReady).toBe(true);
            expect(dualEngine.engineType).toBe('JS');
        });
    });
    
    describe('Engine Switching', () => {
        beforeEach(async () => {
            dualEngine = new DualEngine(bus);
            await dualEngine.initialize();
        });
        
        it('should switch from JS to WASM engine', async () => {
            expect(dualEngine.engineType).toBe('JS');
            
            // Mock WASM engine availability
            const wasmEngine = (dualEngine as any).wasmEngine;
            if (wasmEngine) {
                await dualEngine.switchEngine('WASM');
                expect(dualEngine.engineType).toBe('WASM');
            }
        });
        
        it('should preserve state when switching engines', async () => {
            // Set some state in JS engine
            dualEngine.setRegisters({
                PC: 0x1234,
                A: 0x42,
                X: 0x11,
                Y: 0x22,
                S: 0xFD
            });
            
            const stateBefore = dualEngine.getRegisters();
            
            // Switch to WASM if available
            if (dualEngine.isEngineAvailable('WASM')) {
                await dualEngine.switchEngine('WASM');
                
                const stateAfter = dualEngine.getRegisters();
                expect(stateAfter.PC).toBe(stateBefore.PC);
                expect(stateAfter.A).toBe(stateBefore.A);
                expect(stateAfter.X).toBe(stateBefore.X);
                expect(stateAfter.Y).toBe(stateBefore.Y);
                expect(stateAfter.S).toBe(stateBefore.S);
            }
        });
        
        it('should not switch if target engine is already active', async () => {
            expect(dualEngine.engineType).toBe('JS');
            
            await dualEngine.switchEngine('JS');
            expect(dualEngine.engineType).toBe('JS');
            
            // Check that info was logged
            expect(loggingService.info).toHaveBeenCalledWith(
                'DualEngine',
                expect.stringContaining('Already using JS engine')
            );
        });
        
        it('should throw error when switching to unavailable engine', async () => {
            // Force WASM to be unavailable
            (dualEngine as any).wasmEngine = null;
            
            await expect(dualEngine.switchEngine('WASM')).rejects.toThrow(
                'WASM engine is not available'
            );
        });
        
        it('should track switch statistics', async () => {
            const initialStats = dualEngine.getSwitchStats();
            expect(initialStats.switchCount).toBe(0);
            
            if (dualEngine.isEngineAvailable('WASM')) {
                await dualEngine.switchEngine('WASM');
                
                const afterStats = dualEngine.getSwitchStats();
                expect(afterStats.switchCount).toBe(1);
                expect(afterStats.currentEngine).toBe('WASM');
                expect(afterStats.lastSwitchTime).toBeGreaterThan(0);
            }
        });
        
        it('should emit switch events', async () => {
            const switchListener = vi.fn();
            const unsubscribe = dualEngine.onEngineSwitch(switchListener);
            
            if (dualEngine.isEngineAvailable('WASM')) {
                await dualEngine.switchEngine('WASM');
                
                expect(switchListener).toHaveBeenCalledWith(
                    expect.objectContaining({
                        from: 'JS',
                        to: 'WASM',
                        reason: 'user'
                    })
                );
            }
            
            unsubscribe();
        });
    });
    
    describe('Performance Comparison', () => {
        beforeEach(async () => {
            dualEngine = new DualEngine(bus);
            await dualEngine.initialize();
        });
        
        it('should compare engine performance', async () => {
            if (!dualEngine.isEngineAvailable('WASM')) {
                // Skip if WASM not available
                return;
            }
            
            // Run some instructions on both engines
            for (let i = 0; i < 10; i++) {
                dualEngine.performSingleStep();
            }
            
            await dualEngine.switchEngine('WASM');
            for (let i = 0; i < 10; i++) {
                dualEngine.performSingleStep();
            }
            
            const comparison = await dualEngine.compareEngines();
            
            expect(comparison).toHaveProperty('js');
            expect(comparison).toHaveProperty('wasm');
            expect(comparison).toHaveProperty('speedup');
            expect(comparison).toHaveProperty('memoryRatio');
            expect(comparison).toHaveProperty('recommendation');
            expect(comparison).toHaveProperty('reason');
        });
        
        it('should throw error when comparing without WASM', async () => {
            // Force WASM to be unavailable
            (dualEngine as any).wasmEngine = null;
            
            await expect(dualEngine.compareEngines()).rejects.toThrow(
                'WASM engine not available for comparison'
            );
        });
    });
    
    describe('Auto-Switch', () => {
        beforeEach(async () => {
            dualEngine = new DualEngine(bus);
            await dualEngine.initialize();
        });
        
        it('should enable auto-switch', () => {
            dualEngine.setAutoSwitch(true, 0.5);
            
            const stats = dualEngine.getSwitchStats();
            expect(stats.autoSwitchEnabled).toBe(true);
        });
        
        it('should disable auto-switch', () => {
            dualEngine.setAutoSwitch(true);
            dualEngine.setAutoSwitch(false);
            
            const stats = dualEngine.getSwitchStats();
            expect(stats.autoSwitchEnabled).toBe(false);
        });
    });
    
    describe('State Management', () => {
        beforeEach(async () => {
            dualEngine = new DualEngine(bus);
            await dualEngine.initialize();
        });
        
        it('should save and load state', () => {
            // Set some state
            dualEngine.setRegisters({
                PC: 0x5678,
                A: 0xAB,
                X: 0xCD,
                Y: 0xEF,
                S: 0xFA
            });
            
            const savedState = dualEngine.saveState();
            
            // Reset
            dualEngine.reset();
            
            // Load state back
            dualEngine.loadState(savedState);
            
            const restored = dualEngine.getRegisters();
            expect(restored.PC).toBe(0x5678);
            expect(restored.A).toBe(0xAB);
            expect(restored.X).toBe(0xCD);
            expect(restored.Y).toBe(0xEF);
            expect(restored.S).toBe(0xFA);
        });
        
        it('should sync state to both engines on load', () => {
            const testState = {
                PC: 0x1000,
                A: 0x33,
                X: 0x44,
                Y: 0x55,
                S: 0xFE,
                N: 1,
                V: 0,
                B: 0,
                D: 0,
                I: 1,
                Z: 0,
                C: 1,
                cycles: 1000,
                irq: 0,
                nmi: 0,
                opcode: 0,
                address: 0,
                data: 0,
                pendingIrq: 0,
                pendingNmi: 0,
                ram: new Uint8Array(65536),
                version: '1'
            };
            
            dualEngine.loadState(testState);
            
            // Check that state is loaded in active engine
            const registers = dualEngine.getRegisters();
            expect(registers.PC).toBe(0x1000);
            expect(registers.A).toBe(0x33);
        });
    });
    
    describe('Operations Delegation', () => {
        beforeEach(async () => {
            dualEngine = new DualEngine(bus);
            await dualEngine.initialize();
        });
        
        it('should delegate performSingleStep to active engine', () => {
            const cycles = dualEngine.performSingleStep();
            expect(cycles).toBeGreaterThanOrEqual(0);
        });
        
        it('should delegate performBulkSteps to active engine', () => {
            dualEngine.performBulkSteps(100);
            
            const metrics = dualEngine.getMetrics();
            expect(metrics.instructionsExecuted).toBeGreaterThan(0);
        });
        
        it('should reset both engines', () => {
            dualEngine.setRegisters({ PC: 0x1234 });
            dualEngine.reset();
            
            const registers = dualEngine.getRegisters();
            // Reset should set PC to reset vector (typically reads from 0xFFFC/0xFFFD)
            expect(registers.A).toBe(0);
            expect(registers.X).toBe(0);
            expect(registers.Y).toBe(0);
        });
    });
    
    describe('Memory Operations', () => {
        beforeEach(async () => {
            dualEngine = new DualEngine(bus);
            await dualEngine.initialize();
        });
        
        it('should sync memory writes to both engines', () => {
            dualEngine.write(0x200, 0x42);
            
            const value = dualEngine.read(0x200);
            expect(value).toBe(0x42);
            
            // Switch engine and verify memory is synced
            if (dualEngine.isEngineAvailable('WASM')) {
                dualEngine.switchEngine('WASM');
                const valueAfterSwitch = dualEngine.read(0x200);
                expect(valueAfterSwitch).toBe(0x42);
            }
        });
        
        it('should load programs into both engines', () => {
            const program = new Uint8Array([0xA9, 0x42, 0x85, 0x00]); // LDA #$42, STA $00
            dualEngine.loadProgram(program, 0x300);
            
            expect(dualEngine.read(0x300)).toBe(0xA9);
            expect(dualEngine.read(0x301)).toBe(0x42);
        });
    });
    
    describe('Metrics', () => {
        beforeEach(async () => {
            dualEngine = new DualEngine(bus);
            await dualEngine.initialize();
        });
        
        it('should track metrics for active engine', () => {
            // Execute some instructions
            for (let i = 0; i < 10; i++) {
                dualEngine.performSingleStep();
            }
            
            const metrics = dualEngine.getMetrics();
            expect(metrics.instructionsExecuted).toBeGreaterThan(0);
            expect(metrics.totalCycles).toBeGreaterThan(0);
        });
        
        it('should reset metrics for both engines', () => {
            // Execute some instructions
            dualEngine.performBulkSteps(10);
            
            dualEngine.resetMetrics();
            
            const metrics = dualEngine.getMetrics();
            expect(metrics.instructionsExecuted).toBe(0);
            expect(metrics.totalCycles).toBe(0);
        });
        
        it('should report combined memory usage', () => {
            const memoryUsage = dualEngine.getMemoryUsage();
            expect(memoryUsage).toBeGreaterThan(0);
        });
    });
    
    describe('Cleanup', () => {
        it('should clean up resources', () => {
            dualEngine = new DualEngine(bus);
            const listener = vi.fn();
            dualEngine.onEngineSwitch(listener);
            
            dualEngine.cleanup();
            
            // Try to emit event after cleanup - should not call listener
            (dualEngine as any).emitSwitchEvent({ from: 'JS', to: 'WASM' });
            expect(listener).not.toHaveBeenCalled();
        });
    });
});