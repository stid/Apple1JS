/**
 * WASM vs JS raw-throughput benchmark.
 *
 * NOT part of the normal test run -- gated behind the BENCH env var so it
 * never slows or flakes CI. Run explicitly with:
 *
 *   BENCH=1 npx vitest run src/core/cpu-engines/__tests__/wasm-benchmark.vitest.test.ts
 *
 * It measures real instructions/sec and cycles/sec for each engine by driving
 * performBulkSteps directly (no Clock, no React, no worker) and reading actual
 * executed counts from each engine's metrics. This is the ground-truth anchor
 * for the WASM performance work -- it isolates raw engine speed from the
 * clock-driving and metric-display layers.
 */

import { beforeAll, describe, it } from 'vitest';
import { performance } from 'node:perf_hooks';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import Bus from '../../Bus';
import RAM from '../../RAM';
import { JSEngine } from '../JSEngine';
import { WasmEngine } from '../WasmEngine';
import type { ICPUEngine } from '../../cpu-interface/ICPUEngine';

const BENCH = !!process.env.BENCH;

// wasm-bindgen's --target web init() fetches the .wasm by file:// URL, which
// Node's fetch cannot do. Serve file:// URLs from disk so the WASM module loads
// deterministically here (vitest's asset serving is timing-dependent).
beforeAll(() => {
    if (!BENCH) return;
    const wasmPath = join(process.cwd(), 'src/wasm/apple1_cpu_wasm_bg.wasm');
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (url.endsWith('.wasm')) {
            const bytes = await readFile(wasmPath);
            return new Response(bytes, { headers: { 'content-type': 'application/wasm' } });
        }
        return realFetch(input, init);
    }) as typeof fetch;
});

// A tight RAM-only loop exercising immediate load, zero-page store, zero-page
// load and an absolute jump -- representative instruction mix, no I/O, so the
// loop never returns 0 cycles (isolates pure execution speed).
//   0000: A9 01     LDA #$01
//   0002: 85 10     STA $10
//   0004: A5 10     LDA $10
//   0006: 4C 00 00  JMP $0000
const PROGRAM = [0xa9, 0x01, 0x85, 0x10, 0xa5, 0x10, 0x4c, 0x00, 0x00];

const BATCH = 200_000; // cycles requested per performBulkSteps call
const WALL_BUDGET_MS = 1500; // run each engine for ~this long

function makeBus(): Bus {
    const ram = new RAM(0xffff);
    return new Bus([{ component: ram, addr: [0x0000, 0xffff], name: 'RAM' }]);
}

interface BenchResult {
    label: string;
    wallMs: number;
    requestedCycles: number;
    actualCycles: number;
    actualInstructions: number;
    cyclesPerSec: number;
    instructionsPerSec: number;
}

function runBench(label: string, engine: ICPUEngine): BenchResult {
    // Load program and point PC at it (after any reset performed during setup).
    engine.writeRange(0x0000, new Uint8Array(PROGRAM));
    engine.setRegisters({ PC: 0x0000 });
    engine.resetMetrics?.();

    const before = engine.getMetrics();
    const start = performance.now();
    let requestedCycles = 0;
    let wallMs = 0;
    do {
        engine.performBulkSteps(BATCH);
        requestedCycles += BATCH;
        wallMs = performance.now() - start;
    } while (wallMs < WALL_BUDGET_MS);
    const after = engine.getMetrics();

    const actualCycles = after.totalCycles - before.totalCycles;
    const actualInstructions = after.instructionsExecuted - before.instructionsExecuted;
    const seconds = wallMs / 1000;
    return {
        label,
        wallMs,
        requestedCycles,
        actualCycles,
        actualInstructions,
        cyclesPerSec: actualCycles / seconds,
        instructionsPerSec: actualInstructions / seconds,
    };
}

function fmt(n: number): string {
    return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function report(r: BenchResult): void {
    const completion = r.requestedCycles > 0 ? (r.actualCycles / r.requestedCycles) * 100 : 0;

    console.log(
        `[bench] ${r.label.padEnd(12)} ` +
            `cycles/s=${fmt(r.cyclesPerSec).padStart(13)} (${(r.cyclesPerSec / 1e6).toFixed(2)} MHz)  ` +
            `instr/s=${fmt(r.instructionsPerSec).padStart(13)}  ` +
            `requested=${fmt(r.requestedCycles)} actual=${fmt(r.actualCycles)} ` +
            `(${completion.toFixed(1)}% of requested)`,
    );
}

describe.skipIf(!BENCH)('CPU engine raw-throughput benchmark', () => {
    it('measures JS vs WASM cycles/sec and instructions/sec', async () => {
        const jsEngine = new JSEngine(makeBus());
        await jsEngine.ensureReady();
        const jsResult = runBench('JS', jsEngine);
        report(jsResult);

        const wasmEngine = new WasmEngine(makeBus());
        await wasmEngine.initialize();
        const wasmResult = runBench('WASM', wasmEngine);
        report(wasmResult);

        const speedup = wasmResult.cyclesPerSec / jsResult.cyclesPerSec;

        console.log(`[bench] WASM/JS cycles-per-sec speedup = ${speedup.toFixed(2)}x`);

        jsEngine.cleanup?.();
        wasmEngine.cleanup?.();
    }, 30_000);
});
