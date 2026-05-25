/**
 * Shared performance-metrics bookkeeping for CPU engines.
 *
 * JSEngine and WasmEngine carried byte-identical metrics machinery: the same
 * fields (`hostExecMs`, `lastSecond*`, `metricsStartTime`), the same
 * `initializeMetrics`/`updateMetrics`/`updateIPSMetrics` math, and the same
 * `getMetrics` tail (instantaneous `lastIPS` + `hostMillisPerSecond`). This
 * class owns that logic once so the metric semantics — notably
 * `hostMillisPerSecond`, the real engine-cost signal the throttled in-app IPS
 * hides — are defined in a single place. Engines *compose* a tracker rather
 * than inherit, since each already implements `ICPUEngine`.
 */
import type { EngineMetrics } from '../cpu-interface/ICPUEngine';

// Update the average-IPS window at most this often (ms).
const IPS_UPDATE_INTERVAL_MS = 100;
// Length of the instantaneous-IPS window (ms).
const IPS_SECOND_WINDOW_MS = 1000;
// Periodic memory-usage refresh cadence (every N instructions).
const MEMORY_REFRESH_EVERY = 1000;
// 6502 reference clock used to convert cycles -> emulated seconds.
const CYCLES_PER_EMULATED_SECOND = 1_000_000;

export class EngineMetricsTracker {
    private metrics: EngineMetrics;
    private metricsStartTime = Date.now();
    private lastMetricsUpdate = Date.now();
    private lastSecondInstructions = 0;
    private lastSecondStartTime = Date.now();
    // Cumulative host wall-clock ms spent in bulk execution since the last
    // reset. Divided by emulated seconds in snapshot() to expose real cost.
    private hostExecMs = 0;

    /**
     * @param efficiency Engine baseline efficiency (JS = 100, WASM = 500).
     * @param getMemoryUsage Optional provider polled periodically for memoryUsage.
     */
    constructor(
        private readonly efficiency: number,
        private readonly getMemoryUsage?: () => number,
    ) {
        this.metrics = this.initializeMetrics();
    }

    private initializeMetrics(): EngineMetrics {
        return {
            totalCycles: 0,
            instructionsExecuted: 0,
            averageIPS: 0,
            memoryUsage: 0,
            lastStepDuration: 0,
            initializationTime: 0,
            efficiency: this.efficiency,
        };
    }

    /** Record a single instruction step. `durationMs` is a wall-clock delta. */
    recordStep(cycles: number, durationMs: number): void {
        this.metrics.totalCycles += cycles;
        this.metrics.instructionsExecuted++;
        this.lastSecondInstructions++;
        this.metrics.lastStepDuration = durationMs * 1_000_000; // ns
        this.updateIPSMetrics();

        if (this.getMemoryUsage && this.metrics.instructionsExecuted % MEMORY_REFRESH_EVERY === 0) {
            this.metrics.memoryUsage = this.getMemoryUsage();
        }
    }

    /**
     * Record a bulk batch of `instructions` instructions over `cycles` cycles.
     * Unlike single steps, bulk host time accrues into the host-cost metric.
     */
    recordBulk(cycles: number, durationMs: number, instructions: number): void {
        this.hostExecMs += durationMs;
        this.metrics.totalCycles += cycles;
        this.metrics.lastStepDuration = durationMs * 1_000_000; // ns
        this.metrics.instructionsExecuted += instructions;
        this.lastSecondInstructions += instructions;
        this.updateIPSMetrics();
    }

    /**
     * Overwrite cumulative counts from an authoritative source (e.g. the WASM
     * system's own `get_metrics()`), keeping wall-clock IPS computed here.
     */
    setCounts(counts: { totalCycles?: number; instructionsExecuted?: number }): void {
        if (counts.totalCycles !== undefined) this.metrics.totalCycles = counts.totalCycles;
        if (counts.instructionsExecuted !== undefined) {
            this.metrics.instructionsExecuted = counts.instructionsExecuted;
        }
    }

    setInitializationTime(ms: number): void {
        this.metrics.initializationTime = ms;
    }

    get totalCycles(): number {
        return this.metrics.totalCycles;
    }

    /** Live internal metrics object, for engine debug payloads. */
    raw(): EngineMetrics {
        return this.metrics;
    }

    /** Snapshot with computed instantaneous IPS and host cost, for getMetrics(). */
    snapshot(): EngineMetrics {
        this.updateIPSMetrics();

        const now = Date.now();
        const timeSinceSecondStart = now - this.lastSecondStartTime;
        let lastIPS = 0;
        if (timeSinceSecondStart > 0) {
            lastIPS = Math.floor((this.lastSecondInstructions / timeSinceSecondStart) * 1000);
        }

        return {
            ...this.metrics,
            lastIPS: lastIPS || this.metrics.averageIPS,
            // Host wall-clock ms per emulated second (1MHz => totalCycles/1e6 s).
            hostMillisPerSecond: this.computeHostMillisPerSecond(),
        } as EngineMetrics;
    }

    reset(): void {
        this.metrics = this.initializeMetrics();
        this.metricsStartTime = Date.now();
        this.lastMetricsUpdate = Date.now();
        this.lastSecondInstructions = 0;
        this.lastSecondStartTime = Date.now();
        this.hostExecMs = 0;
    }

    private computeHostMillisPerSecond(): number {
        const emulatedSeconds = this.metrics.totalCycles / CYCLES_PER_EMULATED_SECOND;
        return emulatedSeconds > 0 ? this.hostExecMs / emulatedSeconds : 0;
    }

    private updateIPSMetrics(): void {
        const now = Date.now();
        const timeSinceLastUpdate = now - this.lastMetricsUpdate;

        // Update IPS every 100ms minimum OR when explicitly requested (delta 0).
        if (timeSinceLastUpdate >= IPS_UPDATE_INTERVAL_MS || timeSinceLastUpdate === 0) {
            const totalTime = now - this.metricsStartTime;
            if (totalTime > 0 && this.metrics.instructionsExecuted > 0) {
                this.metrics.averageIPS = Math.floor((this.metrics.instructionsExecuted / totalTime) * 1000);
            }

            // Roll the instantaneous-IPS window once per second.
            const timeSinceSecondStart = now - this.lastSecondStartTime;
            if (timeSinceSecondStart >= IPS_SECOND_WINDOW_MS) {
                this.lastSecondInstructions = 0;
                this.lastSecondStartTime = now;
            }

            if (timeSinceLastUpdate > 0) {
                this.lastMetricsUpdate = now;
            }
        }
    }
}
