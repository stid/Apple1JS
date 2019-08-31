import hrtime from 'browser-process-hrtime';

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
        this.prevCycleTime = hrtime();
    }

    toLog(): void {
        const { mhz, stepChunk, lastCycleCount, nanoPerCycle } = this;
        console.log(
            `CLOCK: ${mhz}Mhz :: stepChunk: ${stepChunk} :: lastCycleCount: ${lastCycleCount} :: nanoPerCycle: ${nanoPerCycle}`,
        );
    }

    _nanoDiff(): number {
        const diff: [number, number] = hrtime(this.prevCycleTime);
        const nanoDelta: number = diff[0] * NS_PER_SEC + diff[1];

        return nanoDelta;
    }

    cycle(): void {
        for (let a = 0; a < this.stepChunk; a++) {
            const nanoDelta: number = this._nanoDiff();

            if (nanoDelta > this.nanoPerCycle * this.lastCycleCount) {
                this.prevCycleTime = hrtime();
                this.lastCycleCount = this.cpu.step();
            }
        }
    }
}

export default Clock;
