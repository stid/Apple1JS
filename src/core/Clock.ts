import wait from 'waait';
import { PubSub, subscribeFunction } from './@types/PubSub';

const DEFAULT_MHZ = 1;
const DEFAULT_STEP_INTERVAL = 30;
const WAIT_TIME = 5;

/**
 * Clock class simulates a clock and allows subscribers to be notified of its changes.
 */
class Clock implements PubSub {
    private mhz: number;
    private stepChunk: number;
    private provisionedCycles: number;
    private maxedCycles: number;
    private subscribers: subscribeFunction<number>[];
    private running: boolean;

    constructor(mhz: number = DEFAULT_MHZ, stepChunk: number = DEFAULT_STEP_INTERVAL) {
        this.mhz = mhz;
        this.stepChunk = stepChunk;
        this.provisionedCycles = 0;
        this.maxedCycles = 0;
        this.subscribers = [];
        this.running = false;
    }

    // Allows a function to subscribe to the clock's updates.
    subscribe(subFunc: subscribeFunction<number>): void {
        this.subscribers.push(subFunc);
        subFunc(this.provisionedCycles);
    }

    // Removes a function from the list of subscribers.
    unsubscribe(subFunc: subscribeFunction<number>): void {
        this.subscribers = this.subscribers.filter((subItem) => subItem !== subFunc);
    }

    // Notify all subscribers about the current provisioned cycles.
    private _notifySubscribers() {
        this.subscribers.forEach((subFunc) => subFunc(this.provisionedCycles));
    }

    // Logs the clock's debug information.
    toLog(): void {
        console.log(this.toDebug());
    }

    // Returns the clock's debug information.
    toDebug(): { [key: string]: number | string } {
        const { mhz, stepChunk, provisionedCycles, maxedCycles } = this;
        return { mhz, stepChunk, provisionedCycles, maxedCycles };
    }

    // Returns the current provisioned cycles.
    getCurrentProvisionedCycles(): number {
        return this.provisionedCycles;
    }

    // Starts the main loop for the clock.
    async startLoop(): Promise<void> {
        this.running = true;
        await this.loop();
    }

    // Stops the main loop for the clock.
    stopLoop(): void {
        this.running = false;
    }

    // Main loop for the clock.
    private async loop(): Promise<void> {
        const stepMax = this.mhz * 1000 * this.stepChunk * 1.25;
        let startTime;
        let lastTime = Date.now();

        while (this.running) {
            startTime = Date.now();
            this.provisionedCycles = (startTime - lastTime) * this.mhz * 1000;
            lastTime = startTime;

            if (this.provisionedCycles > stepMax) {
                this.provisionedCycles = stepMax;
                this.maxedCycles += 1;
            }

            this._notifySubscribers();

            await wait(WAIT_TIME);
        }
    }
}

export default Clock;
