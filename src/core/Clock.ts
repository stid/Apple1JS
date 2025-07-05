import wait from 'waait';
import { PubSub, subscribeFunction } from './@types/PubSub';
import { ErrorHandler } from './errors';

declare const performance: { now(): number };

const DEFAULT_MHZ = 1;
const DEFAULT_STEP_INTERVAL = 30;
const DEFAULT_WAIT_TIME = 5;
const MIN_WAIT_TIME = 1;
const MAX_WAIT_TIME = 50;
const TIMING_SAMPLE_SIZE = 100;
const DRIFT_CORRECTION_THRESHOLD = 0.02; // More aggressive threshold

/**
 * Clock class simulates a clock and allows subscribers to be notified of its changes.
 */
import { IInspectableComponent } from './@types/IInspectableComponent';
import { InspectableData, formatFrequency } from './@types/InspectableTypes';
import { WithBusMetadata } from './@types/BusComponent';
import { TimingStats } from './@types/ClockTypes';

class Clock implements PubSub<number>, IInspectableComponent {
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
    private dynamicWaitTime: number;

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
        this.dynamicWaitTime = DEFAULT_WAIT_TIME;
    }

    get children() {
        return [];
    }

    /**
     * Returns a standardized view of the Clock component.
     */
    getInspectable(): InspectableData {
        const self = this as WithBusMetadata<typeof this>;
        const stats = this.getTimingStats();
        
        return {
            id: this.id,
            type: this.type,
            name: this.name,
            address: self.__address,
            addressName: self.__addressName,
            state: {
                mhz: this.mhz,
                stepChunk: this.stepChunk,
                running: this.running,
                paused: this.paused,
            },
            stats: {
                actualFrequency: formatFrequency(stats.actualFrequency * 1_000_000),
                targetFrequency: formatFrequency(stats.targetFrequency * 1_000_000),
                drift: (stats.drift * 100).toFixed(2) + '%',
                avgCycleTime: stats.avgCycleTime.toFixed(2) + 'ms',
                totalCycles: stats.totalCycles,
                totalTime: stats.totalTime.toFixed(2) + 's'
            },
            // Backward compatibility - flat properties
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
    private notifySubscribers() {
        this.subscribers.forEach((subFunc) => subFunc(this.provisionedCycles));
    }

    // Logs the clock's debug information.

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
        // Reset timing data when starting to ensure clean state
        this.resetTiming();
        await ErrorHandler.handleAsync(this.loop());
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
            // More aggressive compensation: use 0.5x multiplier for drift
            this.driftCompensation = Math.max(0.3, Math.min(2.0, 1.0 - stats.drift * 0.5));
            
            // Also adjust wait time dynamically
            if (stats.drift > 0) {
                // Running too fast, increase wait time
                this.dynamicWaitTime = Math.min(MAX_WAIT_TIME, this.dynamicWaitTime + 1);
            } else if (stats.drift < -0.1) {
                // Running too slow, decrease wait time
                this.dynamicWaitTime = Math.max(MIN_WAIT_TIME, this.dynamicWaitTime - 1);
            }
        } else {
            this.driftCompensation = 1.0;
            // Gradually return to default wait time
            if (this.dynamicWaitTime > DEFAULT_WAIT_TIME) {
                this.dynamicWaitTime--;
            } else if (this.dynamicWaitTime < DEFAULT_WAIT_TIME) {
                this.dynamicWaitTime++;
            }
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
                await wait(this.dynamicWaitTime);
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

            this.notifySubscribers();

            await wait(this.dynamicWaitTime);
        }
    }

    // Reset timing data (useful after state restoration)
    resetTiming(): void {
        this.startTime = 0;
        this.lastFrameTime = 0;
        this.frameTimeSamples = [];
        this.totalElapsedCycles = 0;
        this.driftCompensation = 1.0;
        this.dynamicWaitTime = DEFAULT_WAIT_TIME;
        this.totalPausedTime = 0;
        this.pausedAt = 0;
        this.provisionedCycles = 0;
        this.maxedCycles = 0;
    }
}

export default Clock;
