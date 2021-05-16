import wait from 'waait';

const DEFAULT_MHZ = 1;
const DEFAULT_STEP_INTERVAL = 30;

class Clock {
    private mhz: number;
    private stepChunk: number;
    private lastStepCycleCount: number;
    private currentCycleCount: number;
    private provisionedCycles: number;
    private maxedCycles: number;

    private cpu: Clockable;

    constructor(cpu: Clockable, mhz: number = DEFAULT_MHZ, stepChunk: number = DEFAULT_STEP_INTERVAL) {
        this.mhz = mhz;
        this.stepChunk = stepChunk;
        this.lastStepCycleCount = 1;
        this.cpu = cpu;
        this.currentCycleCount = 0;
        this.provisionedCycles = 0;
        this.maxedCycles = 0;
    }

    toLog(): void {
        console.log(this.toDebug());
    }

    toDebug(): { [key: string]: number | string } {
        const { mhz, stepChunk, lastStepCycleCount, provisionedCycles, maxedCycles } = this;
        return { mhz, stepChunk, lastStepCycleCount, provisionedCycles, maxedCycles };
    }

    async start(): Promise<void> {
        const stepMax = this.mhz * 1000 * this.stepChunk * 1.25;
        let startTime,
            lastTime = Date.now();

        const runLoop = async (): Promise<void> => {
            startTime = Date.now();
            this.provisionedCycles = (startTime - lastTime) * this.mhz * 1000;
            lastTime = startTime;

            if (this.provisionedCycles > stepMax) {
                this.provisionedCycles = stepMax;
                this.maxedCycles += 1;
            }
            while (this.currentCycleCount <= this.provisionedCycles) {
                this.lastStepCycleCount = this.cpu.step();
                this.currentCycleCount += this.lastStepCycleCount;
            }
            this.currentCycleCount = 0;
            await wait(5);
            return runLoop();
        };
        return runLoop();
    }
}

export default Clock;
