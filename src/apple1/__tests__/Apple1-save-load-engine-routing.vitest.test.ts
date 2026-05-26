/**
 * Save/Load must route CPU state through the *active* engine and keep both RAM
 * banks mirrored into the engine's own memory.
 *
 * Regression: when the WASM engine is active, the JS `CPU6502` held as
 * `Apple1.cpu` is dormant, and the WASM engine owns a separate RAM copy. The
 * old save/load path read/wrote only `this.cpu` and the JS Bus, so saving under
 * WASM captured stale registers + stale RAM, and loading under WASM never
 * reached the running engine. These tests inject a spy `ICPUEngine` (no real
 * WASM needed — that path can only run in a browser) and assert the routing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Apple1 from '../index';
import type { ICPUEngine } from '../../core/cpu-interface/ICPUEngine';
import type { CPU6502State } from '../../core/cpu6502/types';
import type { IoComponent } from '../../core/types/io';
import type { VideoState } from '../TSTypes';
import { RAM_BANK1_START, RAM_BANK1_SIZE, RAM_BANK2_START, RAM_BANK2_SIZE } from '../../core/constants/memory';

const BANK1_MARKER = 0xaa;
const BANK2_MARKER = 0xbb;

function makeCpuState(pc: number): CPU6502State {
    return {
        version: '3.0',
        PC: pc,
        A: 0x12,
        X: 0x34,
        Y: 0x56,
        S: 0xfd,
        N: 1,
        V: 0,
        D: 0,
        I: 1,
        Z: 0,
        C: 1,
        irq: 0,
        nmi: 0,
        cycles: 4242,
        opcode: 0,
        address: 0,
        data: 0,
        pendingIrq: 0,
        pendingNmi: 0,
    };
}

/**
 * Spy engine: readRange returns a per-bank marker byte so we can tell which
 * bank a sync touched; saveState returns a sentinel CPU state; loadState /
 * writeRange record their calls.
 */
function makeSpyEngine(savedCpu: CPU6502State) {
    const readRange = vi.fn((start: number, length: number) => {
        const marker = start === RAM_BANK1_START ? BANK1_MARKER : BANK2_MARKER;
        return new Uint8Array(length).fill(marker);
    });
    const engine = {
        engineType: 'WASM' as const,
        engineVersion: 'spy',
        isReady: true,
        ensureReady: vi.fn(async () => undefined),
        performSingleStep: vi.fn(() => 0),
        performBulkSteps: vi.fn(),
        reset: vi.fn(),
        halt: vi.fn(),
        saveState: vi.fn(() => savedCpu),
        loadState: vi.fn(),
        getRegisters: vi.fn(),
        setRegisters: vi.fn(),
        read: vi.fn(() => 0),
        write: vi.fn(),
        readRange,
        writeRange: vi.fn(),
        loadProgram: vi.fn(),
        setBreakpoint: vi.fn(),
        clearBreakpoint: vi.fn(),
        clearAllBreakpoints: vi.fn(),
        getBreakpoints: vi.fn(() => []),
        hasBreakpoint: vi.fn(() => false),
        getMetrics: vi.fn(),
        resetMetrics: vi.fn(),
        getMemoryUsage: vi.fn(() => 0),
    };
    return engine as unknown as ICPUEngine & typeof engine;
}

function makeApple1(): Apple1 {
    // Minimal IO stubs — Apple1 only wires keyboard and routes display writes.
    const keyboard = {
        write: vi.fn(async () => undefined),
        wire: vi.fn(),
        reset: vi.fn(),
    } as unknown as IoComponent;
    const video = {
        write: vi.fn(async () => undefined),
        wire: vi.fn(),
        reset: vi.fn(),
    } as unknown as IoComponent<VideoState>;
    // useDualEngine: false keeps cpuEngine undefined so we control it explicitly.
    return new Apple1({ video, keyboard, useDualEngine: false });
}

describe('Apple1 save/load routes through the active engine', () => {
    let apple1: Apple1;

    beforeEach(() => {
        apple1 = makeApple1();
    });

    describe('deprecated saveEmulatorState/loadEmulatorState (live worker path)', () => {
        it('saveEmulatorState reads CPU + RAM from cpuEngine when present', () => {
            const savedCpu = makeCpuState(0xc0de);
            const spy = makeSpyEngine(savedCpu);
            apple1.cpuEngine = spy;

            const state = apple1.saveEmulatorState();

            // CPU came from the active engine, not the dormant JS cpu
            expect(spy.saveState).toHaveBeenCalledTimes(1);
            expect(state.cpu).toBe(savedCpu);

            // RAM was pulled from the active engine for BOTH banks
            expect(spy.readRange).toHaveBeenCalledWith(RAM_BANK1_START, RAM_BANK1_SIZE);
            expect(spy.readRange).toHaveBeenCalledWith(RAM_BANK2_START, RAM_BANK2_SIZE);
            const bank1 = state.ram.find((b) => b.id === 'ram1')!;
            const bank2 = state.ram.find((b) => b.id === 'ram2')!;
            expect(bank1.state.data[0]).toBe(BANK1_MARKER);
            expect(bank2.state.data[0]).toBe(BANK2_MARKER);
        });

        it('loadEmulatorState writes CPU + both RAM banks into cpuEngine', () => {
            // Build a valid-shaped state, then overwrite RAM bytes with markers.
            const baseState = apple1.saveEmulatorState();
            const loadedCpu = makeCpuState(0x0e00);
            baseState.cpu = loadedCpu;
            baseState.ram.find((b) => b.id === 'ram1')!.state.data.fill(0x11);
            baseState.ram.find((b) => b.id === 'ram2')!.state.data.fill(0x22);

            const spy = makeSpyEngine(makeCpuState(0));
            apple1.cpuEngine = spy;

            apple1.loadEmulatorState(baseState);

            // CPU loaded into the active engine
            expect(spy.loadState).toHaveBeenCalledWith(loadedCpu);

            // Restored RAM mirrored into the engine for BOTH banks
            const writes = spy.writeRange.mock.calls;
            const bank1Write = writes.find((c) => c[0] === RAM_BANK1_START);
            const bank2Write = writes.find((c) => c[0] === RAM_BANK2_START);
            expect(bank1Write?.[1][0]).toBe(0x11);
            expect(bank2Write?.[1][0]).toBe(0x22);
        });
    });

    describe('versioned saveState/applyState', () => {
        it('saveState reads CPU + RAM from cpuEngine when present', () => {
            const savedCpu = makeCpuState(0xbeef);
            const spy = makeSpyEngine(savedCpu);
            apple1.cpuEngine = spy;

            const state = apple1.saveState();

            expect(spy.saveState).toHaveBeenCalledTimes(1);
            expect(state.cpu).toBe(savedCpu);
            expect(spy.readRange).toHaveBeenCalledWith(RAM_BANK1_START, RAM_BANK1_SIZE);
            expect(spy.readRange).toHaveBeenCalledWith(RAM_BANK2_START, RAM_BANK2_SIZE);
            expect(state.ramBank1.data[0]).toBe(BANK1_MARKER);
            expect(state.ramBank2.data[0]).toBe(BANK2_MARKER);
        });

        it('applyState writes CPU + both RAM banks into cpuEngine', () => {
            const baseState = apple1.saveState();
            const loadedCpu = makeCpuState(0x0200);
            baseState.cpu = loadedCpu;
            baseState.ramBank1.data.fill(0x11);
            baseState.ramBank2.data.fill(0x22);

            const spy = makeSpyEngine(makeCpuState(0));
            apple1.cpuEngine = spy;

            apple1.loadState(baseState);

            expect(spy.loadState).toHaveBeenCalledWith(loadedCpu);
            const writes = spy.writeRange.mock.calls;
            expect(writes.find((c) => c[0] === RAM_BANK1_START)?.[1][0]).toBe(0x11);
            expect(writes.find((c) => c[0] === RAM_BANK2_START)?.[1][0]).toBe(0x22);
        });
    });

    describe('regression guard: pure-JS path (no cpuEngine)', () => {
        it('saveEmulatorState still uses the JS cpu and produces a valid state', () => {
            expect(apple1.cpuEngine).toBeUndefined();
            const state = apple1.saveEmulatorState();
            expect(state.cpu).toBeDefined();
            expect(state.ram).toHaveLength(2);
        });
    });
});
