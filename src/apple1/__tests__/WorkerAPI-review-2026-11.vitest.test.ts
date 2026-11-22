/**
 * Debugger control flow on a real WorkerState + Apple1 + DualEngine (the JS
 * engine under Node, where the WASM build cannot load and DualEngine falls back;
 * the WASM engine when a dev server is serving it). The older WorkerAPI tests use
 * hand-built fake state and only assert routing, which is how the defects
 * below went unnoticed.
 *
 * The clock loop is never started here. `engine.performBulkSteps(n)` is exactly
 * what the clock calls each tick, so the tests drive it directly.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkerState } from '../WorkerState';
import { WorkerAPI } from '../WorkerAPI';

const PROGRAM = 0x0300;
const NOP = 0xea;

describe('WorkerAPI debugger control (review-2026-11)', () => {
    let state: WorkerState;
    let api: WorkerAPI;

    const engine = () => {
        const dual = state.getDualEngine();
        if (!dual) throw new Error('dual engine missing');
        return dual;
    };
    const pc = () => engine().getRegisters().PC;
    /** One clock tick worth of execution. */
    const tick = (cycles = 20) => engine().performBulkSteps(cycles);

    beforeEach(async () => {
        state = new WorkerState();
        api = new WorkerAPI(state);
        // What Apple1.startLoop() does before the clock runs.
        await engine().initialize();
        engine().writeRange(PROGRAM, new Uint8Array(0x80).fill(NOP));
        engine().setRegisters({ PC: PROGRAM });
        state.isPaused = true;
    });

    it('has a working active engine with the program in place', () => {
        // JS under plain Node; WASM when `yarn dev:vite` is serving the build,
        // in which case every test below exercises the Rust engine instead.
        expect(['JS', 'WASM']).toContain(engine().engineType);
        expect(pc()).toBe(PROGRAM);
    });

    it('resume steps off a breakpoint under the PC instead of re-halting on it', () => {
        api.setBreakpoint(PROGRAM);

        api.resumeEmulation();
        tick();

        expect(pc()).toBeGreaterThan(PROGRAM);
        expect(api.getEmulationStatus()).toBe('running');
    });

    it('resume still stops at the next breakpoint', () => {
        const hits: number[] = [];
        api.onBreakpointHit((address) => hits.push(address));
        api.setBreakpoint(PROGRAM);
        api.setBreakpoint(PROGRAM + 4);

        api.resumeEmulation();
        tick();

        expect(pc()).toBe(PROGRAM + 4);
        expect(hits).toEqual([PROGRAM + 4]);
        expect(api.getEmulationStatus()).toBe('paused');
    });

    it('run-to-cursor leaves a breakpoint under the PC behind', () => {
        api.setBreakpoint(PROGRAM);

        api.runToAddress(PROGRAM + 6);
        tick();

        expect(pc()).toBe(PROGRAM + 6);
    });

    it('a second run-to-cursor removes the transient breakpoint of the first', () => {
        const hits: number[] = [];
        api.onBreakpointHit((address) => hits.push(address));

        api.runToAddress(PROGRAM + 0x10);
        api.runToAddress(PROGRAM + 4);
        tick();
        expect(pc()).toBe(PROGRAM + 4);

        // The first target must be gone: resuming runs straight through it.
        api.resumeEmulation();
        tick(40);

        expect(pc()).toBeGreaterThan(PROGRAM + 0x10);
        expect(hits).toEqual([]);
    });

    it('clearing all breakpoints cancels a pending run-to-cursor', () => {
        const targets: Array<number | null> = [];
        api.onRunToCursorTarget((target) => targets.push(target));

        api.runToAddress(PROGRAM + 8);
        api.clearAllBreakpoints();
        tick(40);

        expect(state.runToCursorTarget).toBeNull();
        expect(targets).toEqual([PROGRAM + 8, null]);
        expect(pc()).toBeGreaterThan(PROGRAM + 8);
    });

    it('removing a user breakpoint on the run-to-cursor target keeps the run pending', () => {
        api.setBreakpoint(PROGRAM + 8);
        api.runToAddress(PROGRAM + 8);

        api.clearBreakpoint(PROGRAM + 8);
        tick(40);

        expect(pc()).toBe(PROGRAM + 8);
        expect(state.runToCursorTarget).toBeNull();
    });

    it('reading memory from the debugger does not consume the keyboard strobe', () => {
        const KBD = 0xd010;
        const KBDCR = 0xd011;
        const bus = state.apple1.bus;
        bus.write(KBDCR, 0xa7); // as WOZ Monitor does: select the data register, enable CA1
        api.keyDown('A');
        expect(bus.read(KBDCR) & 0x80).toBe(0x80); // key waiting

        // A memory view covering the PIA page, as the hex viewer does on a poll.
        const seen = api.readMemoryRange(KBD, 4);

        expect(seen[0] & 0x7f).toBe('A'.charCodeAt(0));
        expect(bus.read(KBDCR) & 0x80).toBe(0x80); // still waiting for the CPU
        // The CPU's own read is what consumes it.
        bus.read(KBD);
        expect(bus.read(KBDCR) & 0x80).toBe(0);
    });

    it('loadState does not start a second clock loop', () => {
        const startLoop = vi.spyOn(state.apple1.clock, 'startLoop').mockResolvedValue();
        vi.spyOn(state.apple1, 'startLoop').mockResolvedValue();
        const snapshot = api.saveState();

        api.loadState(snapshot);

        // The loop is started once, by the worker at boot. A state load only
        // needs fresh timing; it must not ask for another loop.
        expect(startLoop).not.toHaveBeenCalled();
        expect(state.apple1.startLoop).not.toHaveBeenCalled();
    });

    it('a failing clock tick pauses the emulator and reports it', () => {
        const statuses: string[] = [];
        api.onEmulationStatus((status) => statuses.push(status));
        state.isPaused = false;

        state.apple1.clock.reportTickError(new Error('wasm trap'));

        expect(state.isPaused).toBe(true);
        expect(statuses).toEqual(['paused']);
    });
});
