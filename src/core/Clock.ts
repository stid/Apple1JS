import wait from 'waait';

const DEFAULT_MHZ = 1;
const DEFAULT_STEP_INTERVAL = 30;

class Clock implements PubSub {
    private mhz: number;
    private stepChunk: number;
    private provisionedCycles: number;
    private maxedCycles: number;
    private subscribers: subscribeFunction<number>[];

    constructor(mhz: number = DEFAULT_MHZ, stepChunk: number = DEFAULT_STEP_INTERVAL) {
        this.mhz = mhz;
        this.stepChunk = stepChunk;
        this.provisionedCycles = 0;
        this.maxedCycles = 0;
        this.subscribers = [];
    }

    subscribe(subFunc: subscribeFunction<number>): void {
        this.subscribers.push(subFunc);
        subFunc(this.provisionedCycles);
    }

    unsubscribe(subFunc: subscribeFunction<number>): void {
        this.subscribers = this.subscribers.filter((subItem) => subItem !== subFunc);
    }

    private _notifySubscribers() {
        this.subscribers.forEach((subFunc) => subFunc(this.provisionedCycles));
    }

    toLog(): void {
        console.log(this.toDebug());
    }

    toDebug(): { [key: string]: number | string } {
        const { mhz, stepChunk, provisionedCycles, maxedCycles } = this;
        return { mhz, stepChunk, provisionedCycles, maxedCycles };
    }

    getCurrentProvisionedCycles(): number {
        return this.provisionedCycles;
    }

    async loop(): Promise<void> {
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

            this._notifySubscribers();

            await wait(5);
            return runLoop();
        };
        return runLoop();
    }
}

export default Clock;
