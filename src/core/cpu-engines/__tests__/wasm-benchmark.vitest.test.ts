/**
 * WASM vs JS raw-throughput benchmark.
 *
 * NOT part of the normal test run -- gated behind the BENCH env var so it
 * never slows or flakes CI. Run explicitly with:
 *
 *   BENCH=1 npx vitest run src/core/cpu-engines/__tests__/wasm-benchmark.vitest.test.ts
 *
 * It measures cycles/sec and instructions/sec for each engine by driving
 * performBulkSteps directly (no Clock, no React, no worker) and reading the
 * counts from each engine's metrics. Cycles are exact on both engines; the
 * instruction count is exact on WASM and an estimate (cycles / 3) on JS. This is the ground-truth anchor
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

interface Workload {
    name: string;
    origin: number;
    program: number[];
    /** Zero-page bytes to set before the run. */
    zeroPage?: Array<[number, number]>;
}

// A tight RAM-only loop exercising immediate load, zero-page store, zero-page
// load and an absolute jump -- no I/O, so the loop never returns 0 cycles
// (isolates pure execution speed). It touches ten distinct addresses.
//   0000: A9 01     LDA #$01
//   0002: 85 10     STA $10
//   0004: A5 10     LDA $10
//   0006: 4C 00 00  JMP $0000
const TIGHT_LOOP: Workload = {
    name: 'tight loop',
    origin: 0x0000,
    program: [0xa9, 0x01, 0x85, 0x10, 0xa5, 0x10, 0x4c, 0x00, 0x00],
};

// A block copy that walks eight pages of each RAM bank ($0800-$0FFF to
// $E000-$E7FF) over and over: 4096 distinct data addresses, so address decoding
// is measured on memory the engine has not just touched. The tight loop alone
// cannot show a decode cost that depends on how many addresses are in play.
//   0200: A0 00     LDY #$00
//   0202: B1 10     LDA ($10),Y
//   0204: 91 12     STA ($12),Y
//   0206: C8        INY
//   0207: D0 F9     BNE $0202
//   0209: A5 11     LDA $11        ; next page: ($11 + 1) & 7
//   020B: 18        CLC
//   020C: 69 01     ADC #$01
//   020E: 29 07     AND #$07
//   0210: AA        TAX
//   0211: 09 08     ORA #$08       ; source page $08-$0F
//   0213: 85 11     STA $11
//   0215: 8A        TXA
//   0216: 09 E0     ORA #$E0       ; destination page $E0-$E7
//   0218: 85 13     STA $13
//   021A: 4C 00 02  JMP $0200
const MEMORY_SWEEP: Workload = {
    name: 'memory sweep',
    origin: 0x0200,
    program: [
        0xa0, 0x00, 0xb1, 0x10, 0x91, 0x12, 0xc8, 0xd0, 0xf9, 0xa5, 0x11, 0x18, 0x69, 0x01, 0x29, 0x07, 0xaa, 0x09,
        0x08, 0x85, 0x11, 0x8a, 0x09, 0xe0, 0x85, 0x13, 0x4c, 0x00, 0x02,
    ],
    zeroPage: [
        [0x10, 0x00],
        [0x11, 0x08],
        [0x12, 0x00],
        [0x13, 0xe0],
    ],
};

const BATCH = 200_000; // cycles requested per performBulkSteps call
const WALL_BUDGET_MS = 1500; // run each engine for ~this long

// The Apple 1's two 4K RAM banks, as the WASM engine maps them internally.
function makeBus(): Bus {
    return new Bus([
        { component: new RAM(0x1000), addr: [0x0000, 0x0fff], name: 'RAM_BANK_1' },
        { component: new RAM(0x1000), addr: [0xe000, 0xefff], name: 'RAM_BANK_2' },
    ]);
}

interface BenchResult {
    label: string;
    wallMs: number;
    requestedCycles: number;
    actualCycles: number;
    actualInstructions: number;
    /** The JS engine does not count instructions; it reports cycles / 3. */
    instructionsEstimated: boolean;
    cyclesPerSec: number;
    instructionsPerSec: number;
}

function runBench(label: string, engine: ICPUEngine, workload: Workload): BenchResult {
    // Load program and point PC at it (after any reset performed during setup).
    engine.writeRange(workload.origin, new Uint8Array(workload.program));
    for (const [address, value] of workload.zeroPage ?? []) {
        engine.writeRange(address, new Uint8Array([value]));
    }
    engine.setRegisters({ PC: workload.origin });
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
        instructionsEstimated: engine.engineType === 'JS',
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
        `[bench] ${r.label.padEnd(18)} ` +
            `cycles/s=${fmt(r.cyclesPerSec).padStart(13)} (${(r.cyclesPerSec / 1e6).toFixed(2)} MHz)  ` +
            `instr/s${r.instructionsEstimated ? ' (est. cycles/3)' : ''}=${fmt(r.instructionsPerSec).padStart(13)}  ` +
            `requested=${fmt(r.requestedCycles)} actual=${fmt(r.actualCycles)} ` +
            `(${completion.toFixed(1)}% of requested)`,
    );
}

describe.skipIf(!BENCH)('CPU engine raw-throughput benchmark', () => {
    it.each([TIGHT_LOOP, MEMORY_SWEEP])(
        'measures JS vs WASM cycles/sec and instructions/sec: $name',
        async (workload) => {
            const jsEngine = new JSEngine(makeBus());
            await jsEngine.ensureReady();
            const jsResult = runBench(`JS ${workload.name}`, jsEngine, workload);
            report(jsResult);

            const wasmEngine = new WasmEngine(makeBus());
            await wasmEngine.initialize();
            const wasmResult = runBench(`WASM ${workload.name}`, wasmEngine, workload);
            report(wasmResult);

            const speedup = wasmResult.cyclesPerSec / jsResult.cyclesPerSec;

            console.log(`[bench] ${workload.name}: WASM/JS cycles-per-sec speedup = ${speedup.toFixed(2)}x`);

            jsEngine.cleanup?.();
            wasmEngine.cleanup?.();
        },
        30_000,
    );
});
