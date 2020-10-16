const NS_PER_SEC = 1e9;
const DEFAULT_MHZ = 1;
const DEFAULT_STEP_CHUNK = 10;

class Clock {
    private mhz: number;
    private stepChunk: number;
    private prevCycleTime: [number, number];
    private nanoPerCycle: number;
    private lastCycleCount: number;
    private cpu: Clockable;

    constructor(cpu: Clockable, mhz: number = DEFAULT_MHZ, stepChunk: number = DEFAULT_STEP_CHUNK) {
        this.mhz = mhz;
        this.stepChunk = stepChunk;
        this.lastCycleCount = 1;
        this.nanoPerCycle = 1000 / this.mhz;
        this.cpu = cpu;
        this.prevCycleTime = this.hrtime();
    }

    toLog(): void {
        console.log(this.toDebug());
    }

    toDebug(): { [key: string]: number | string } {
        const { mhz, stepChunk, lastCycleCount, nanoPerCycle } = this;
        return { mhz, stepChunk, lastCycleCount, nanoPerCycle, prevCycleTime: this.prevCycleTime.join(':') };
    }

    _nanoDiff(): number {
        const diff: [number, number] = this.hrtime(this.prevCycleTime);
        const nanoDelta: number = diff[0] * NS_PER_SEC + diff[1];

        return nanoDelta;
    }

    cycle(): void {
        for (let a = 0; a < this.stepChunk; a++) {
            const nanoDelta: number = this._nanoDiff();

            if (nanoDelta > this.nanoPerCycle * this.lastCycleCount) {
                this.prevCycleTime = this.hrtime();
                this.lastCycleCount = this.cpu.step();
            }
        }
    }

    // Extracted from: https://github.com/kumavis/browser-process-hrtime
    hrtime(previousTimestamp?: [number, number]): [number, number] {
        const performance = global.performance || {};

        const performanceNow =
            performance.now ||
            function () {
                return new Date().getTime();
            };

        const clocktime = performanceNow.call(performance) * 1e-3;
        let seconds = Math.floor(clocktime);
        let nanoseconds = Math.floor((clocktime % 1) * 1e9);
        if (previousTimestamp) {
            seconds = seconds - previousTimestamp[0];
            nanoseconds = nanoseconds - previousTimestamp[1];
            if (nanoseconds < 0) {
                seconds--;
                nanoseconds += 1e9;
            }
        }
        return [seconds, nanoseconds];
    }
}

export default Clock;
