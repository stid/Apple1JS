import wait from 'waait';

const DEFAULT_MHZ = 1;
const DEFAULT_STEP_CHUNK = 10;

class Clock {
    private mhz: number;
    private stepChunk: number;
    private lastCycleCount: number;
    private currentCycleCount: number;
    private provisionedCycles: number;

    private cpu: Clockable;

    constructor(cpu: Clockable, mhz: number = DEFAULT_MHZ, stepChunk: number = DEFAULT_STEP_CHUNK) {
        this.mhz = mhz;
        this.stepChunk = stepChunk;
        this.lastCycleCount = 1;
        this.cpu = cpu;
        this.currentCycleCount = 0;
        this.provisionedCycles = 0;
    }

    toLog(): void {
        console.log(this.toDebug());
    }

    toDebug(): { [key: string]: number | string } {
        const { mhz, stepChunk, lastCycleCount, provisionedCycles } = this;
        return { mhz, stepChunk, lastCycleCount, provisionedCycles };
    }

    async start(): Promise<void> {
        const stepMax = this.mhz * 1023 * DEFAULT_STEP_CHUNK * 1.25;
        let startTime = Date.now();
        let lastTime = Date.now();

        const runLoop = async () => {
            startTime = Date.now();
            this.provisionedCycles = (startTime - lastTime) * this.mhz * 1023;
            lastTime = startTime;

            if (this.provisionedCycles > stepMax) {
                this.provisionedCycles = stepMax;
            }
            while (this.currentCycleCount <= this.provisionedCycles) {
                this.lastCycleCount = this.cpu.step();
                this.currentCycleCount += this.lastCycleCount;
            }
            this.currentCycleCount = 0;
            await wait(DEFAULT_STEP_CHUNK);
            runLoop();
        };
        runLoop();
    }
}

export default Clock;
