import { EngineMetricsTracker } from '../EngineMetricsTracker';

describe('EngineMetricsTracker', () => {
    it('carries the engine efficiency baseline into snapshots', () => {
        expect(new EngineMetricsTracker(100).snapshot().efficiency).toBe(100);
        expect(new EngineMetricsTracker(500).snapshot().efficiency).toBe(500);
    });

    it('accumulates cycles and instructions across single steps', () => {
        const t = new EngineMetricsTracker(100);
        t.recordStep(2, 0);
        t.recordStep(3, 0);
        const m = t.snapshot();
        expect(m.totalCycles).toBe(5);
        expect(m.instructionsExecuted).toBe(2);
    });

    it('accumulates a bulk batch by explicit instruction count', () => {
        const t = new EngineMetricsTracker(100);
        t.recordBulk(300, 0, 100);
        const m = t.snapshot();
        expect(m.totalCycles).toBe(300);
        expect(m.instructionsExecuted).toBe(100);
    });

    it('derives host ms per emulated second from bulk host time', () => {
        const t = new EngineMetricsTracker(100);
        // 1,000,000 cycles at 1MHz == 1 emulated second; 50ms host time => 50 ms/s.
        t.recordBulk(1_000_000, 50, 333_333);
        expect(t.snapshot().hostMillisPerSecond).toBeCloseTo(50, 5);
    });

    it('reports zero host ms per second before any bulk execution', () => {
        const t = new EngineMetricsTracker(100);
        t.recordStep(5, 0); // single steps do not accrue host exec time
        expect(t.snapshot().hostMillisPerSecond).toBe(0);
    });

    it('lets an authoritative source override cumulative counts', () => {
        const t = new EngineMetricsTracker(500);
        t.recordBulk(10, 1, 3);
        t.setCounts({ totalCycles: 9999, instructionsExecuted: 1234 });
        const m = t.snapshot();
        expect(m.totalCycles).toBe(9999);
        expect(m.instructionsExecuted).toBe(1234);
    });

    it('records last step duration in nanoseconds', () => {
        const t = new EngineMetricsTracker(100);
        t.recordStep(2, 2); // 2ms
        expect(t.snapshot().lastStepDuration).toBe(2_000_000);
    });

    it('reset() returns all counters to their initial values', () => {
        const t = new EngineMetricsTracker(100);
        t.recordBulk(1_000_000, 50, 100);
        t.reset();
        const m = t.snapshot();
        expect(m.totalCycles).toBe(0);
        expect(m.instructionsExecuted).toBe(0);
        expect(m.hostMillisPerSecond).toBe(0);
        expect(m.efficiency).toBe(100);
    });

    it('exposes the live metrics object and total cycles for debug payloads', () => {
        const t = new EngineMetricsTracker(100);
        t.recordStep(7, 0);
        expect(t.totalCycles).toBe(7);
        expect(t.raw().totalCycles).toBe(7);
    });
});
