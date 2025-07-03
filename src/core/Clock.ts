import wait from 'waait';
import { PubSub, subscribeFunction } from './@types/PubSub';

declare const performance: { now(): number };

const DEFAULT_MHZ = 1;
const DEFAULT_STEP_INTERVAL = 30;
const WAIT_TIME = 5;
const TIMING_SAMPLE_SIZE = 100;
const DRIFT_CORRECTION_THRESHOLD = 0.05;

/**
 * Clock class simulates a clock and allows subscribers to be notified of its changes.
 */
import { IInspectableComponent } from './@types/IInspectableComponent';

interface TimingStats {
    actualFrequency: number;
    targetFrequency: number;
    drift: number;
    avgCycleTime: number;
    totalCycles: number;
    totalTime: number;
}

class Clock implements PubSub, IInspectableComponent {
    id = 'clock';
    type = 'Clock';
    name?: string;
    private mhz: number;
    private stepChunk: number;
    private provisionedCycles: number;
    private maxedCycles: number;
    private subscribers: subscribeFunction<number>[];
    private running: boolean;
    private paused: boolean;
    private pausedAt: number;
    private totalPausedTime: number;
    private lastFrameTime: number;
    private frameTimeSamples: number[];
    private totalElapsedCycles: number;
    private startTime: number;
    private driftCompensation: number;

    constructor(mhz: number = DEFAULT_MHZ, stepChunk: number = DEFAULT_STEP_INTERVAL) {
        this.mhz = mhz;
        this.stepChunk = stepChunk;
        this.provisionedCycles = 0;
        this.maxedCycles = 0;
        this.subscribers = [];
        this.running = false;
        this.paused = false;
        this.pausedAt = 0;
        this.totalPausedTime = 0;
        this.lastFrameTime = 0;
        this.frameTimeSamples = [];
        this.totalElapsedCycles = 0;
        this.startTime = 0;
        this.driftCompensation = 1.0;
    }

    get children() {
        return [];
    }

    /**
     * Returns a serializable architecture view of the Clock, suitable for inspectors.
     */
    getInspectable() {
        const self = this as unknown as { __address?: string; __addressName?: string };
        const stats = this.getTimingStats();
        return {
            id: this.id,
            type: this.type,
            name: this.name,
            address: self.__address,
            addressName: self.__addressName,
            mhz: this.mhz,
            stepChunk: this.stepChunk,
            running: this.running,
            paused: this.paused,
            actualFrequency: stats.actualFrequency.toFixed(3) + ' MHz',
            drift: (stats.drift * 100).toFixed(2) + '%',
            avgCycleTime: stats.avgCycleTime.toFixed(2) + 'ms',
            totalCycles: stats.totalCycles,
        };
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
    toDebug(): { [key: string]: number | string | boolean } {
        const { mhz, stepChunk, provisionedCycles, maxedCycles } = this;
        const stats = this.getTimingStats();
        return { 
            mhz, 
            stepChunk, 
            provisionedCycles, 
            maxedCycles,
            actualFrequency: stats.actualFrequency,
            drift: stats.drift,
            running: this.running,
            paused: this.paused
        };
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
        this.paused = false;
        this.totalPausedTime = 0;
        this.frameTimeSamples = [];
        this.totalElapsedCycles = 0;
    }

    // Pause the clock, preserving state
    pause(): void {
        if (this.running && !this.paused) {
            this.paused = true;
            this.pausedAt = performance.now();
        }
    }

    // Resume the clock from pause
    resume(): void {
        if (this.running && this.paused) {
            this.totalPausedTime += performance.now() - this.pausedAt;
            this.paused = false;
        }
    }

    // Get current timing statistics
    private getTimingStats(): TimingStats {
        const elapsedTime = this.startTime ? (performance.now() - this.startTime - this.totalPausedTime) / 1000 : 0;
        const actualFrequency = elapsedTime > 0 ? this.totalElapsedCycles / elapsedTime / 1000000 : 0;
        const targetFrequency = this.mhz;
        const drift = targetFrequency > 0 ? (actualFrequency - targetFrequency) / targetFrequency : 0;
        
        const avgCycleTime = this.frameTimeSamples.length > 0 
            ? this.frameTimeSamples.reduce((a, b) => a + b, 0) / this.frameTimeSamples.length 
            : 0;

        return {
            actualFrequency,
            targetFrequency,
            drift,
            avgCycleTime,
            totalCycles: this.totalElapsedCycles,
            totalTime: elapsedTime
        };
    }

    // Update drift compensation based on timing statistics
    private updateDriftCompensation(): void {
        const stats = this.getTimingStats();
        if (Math.abs(stats.drift) > DRIFT_CORRECTION_THRESHOLD) {
            this.driftCompensation = Math.max(0.5, Math.min(1.5, 1.0 - stats.drift * 0.1));
        } else {
            this.driftCompensation = 1.0;
        }
    }

    // Main loop for the clock.
    private async loop(): Promise<void> {
        const stepMax = this.mhz * 1000 * this.stepChunk * 1.25;
        this.startTime = performance.now();
        this.lastFrameTime = this.startTime;
        let frameCount = 0;

        while (this.running) {
            if (this.paused) {
                await wait(WAIT_TIME);
                continue;
            }

            const currentTime = performance.now();
            const deltaTime = currentTime - this.lastFrameTime;
            
            this.provisionedCycles = Math.floor(deltaTime * this.mhz * 1000 * this.driftCompensation);
            this.lastFrameTime = currentTime;

            if (this.provisionedCycles > stepMax) {
                this.provisionedCycles = stepMax;
                this.maxedCycles += 1;
            }

            this.totalElapsedCycles += this.provisionedCycles;

            this.frameTimeSamples.push(deltaTime);
            if (this.frameTimeSamples.length > TIMING_SAMPLE_SIZE) {
                this.frameTimeSamples.shift();
            }

            frameCount++;
            if (frameCount % TIMING_SAMPLE_SIZE === 0) {
                this.updateDriftCompensation();
            }

            this._notifySubscribers();

            await wait(WAIT_TIME);
        }
    }
}

export default Clock;
