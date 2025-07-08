import wait from 'waait';
import { PubSub, subscribeFunction } from './types';
import { ErrorHandler } from './errors';

declare const performance: { now(): number };

const DEFAULT_MHZ = 1;
const DEFAULT_STEP_INTERVAL = 30;
const DEFAULT_WAIT_TIME = 5;
const MIN_WAIT_TIME = 1;
const MAX_WAIT_TIME = 50;
const TIMING_SAMPLE_SIZE = 100;
const DRIFT_CORRECTION_THRESHOLD = 0.02; // More aggressive threshold

import { IInspectableComponent, InspectableData, WithBusMetadata } from './types';
import type { TimingStats, IVersionedStatefulComponent, StateValidationResult, StateOptions, StateBase } from './types';
import { StateError } from './types';

/**
 * Clock state interface for serialization/deserialization
 */
interface ClockState extends StateBase {
    /** Clock configuration */
    mhz: number;
    stepChunk: number;
    
    /** Execution state */
    running: boolean;
    paused: boolean;
    
    /** Timing state */
    provisionedCycles: number;
    maxedCycles: number;
    totalElapsedCycles: number;
    
    /** Pause management */
    pausedAt: number;
    totalPausedTime: number;
    
    /** Performance tracking */
    frameTimeSamples: number[];
    driftCompensation: number;
    dynamicWaitTime: number;
}

/**
 * Clock class simulates a clock and allows subscribers to be notified of its changes.
 */

class Clock implements PubSub<number>, IInspectableComponent, IVersionedStatefulComponent<ClockState> {
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

    /** Current state schema version */
    private static readonly STATE_VERSION = '2.0';

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
            name: this.name ?? '',
            ...(self.__address !== undefined && { address: self.__address }),
            ...(self.__addressName !== undefined && { addressName: self.__addressName }),
            state: {
                mhz: this.mhz,
                stepChunk: this.stepChunk,
                running: this.running,
                paused: this.paused,
            },
            stats: {
                actualFrequency: `${stats.actualFrequency.toFixed(3)} MHz`,
                targetFrequency: `${stats.targetFrequency.toFixed(3)} MHz`,
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

    ////////////////////////////////////////////////////////////////////////////////
    // State Management Implementation
    ////////////////////////////////////////////////////////////////////////////////

    /**
     * Save the current state of the Clock
     */
    saveState(options?: StateOptions): ClockState {
        const opts = { includeDebugInfo: false, includeRuntimeState: false, ...options };
        
        const state: ClockState = {
            version: Clock.STATE_VERSION,
            // Configuration
            mhz: this.mhz,
            stepChunk: this.stepChunk,
            // Execution state
            running: this.running,
            paused: this.paused,
            // Timing state
            provisionedCycles: this.provisionedCycles,
            maxedCycles: this.maxedCycles,
            totalElapsedCycles: this.totalElapsedCycles,
            // Pause management
            pausedAt: this.pausedAt,
            totalPausedTime: this.totalPausedTime,
            // Performance tracking
            frameTimeSamples: [...this.frameTimeSamples], // Copy array
            driftCompensation: this.driftCompensation,
            dynamicWaitTime: this.dynamicWaitTime,
        };

        if (opts.includeDebugInfo) {
            Object.assign(state, {
                metadata: {
                    timestamp: Date.now(),
                    componentId: 'Clock',
                }
            });
        }

        return state;
    }

    /**
     * Restore the Clock from a saved state
     */
    loadState(state: ClockState, options?: StateOptions): void {
        const opts = { validate: true, migrate: true, ...options };
        
        if (opts.validate) {
            const validation = this.validateState(state);
            if (!validation.valid) {
                throw new StateError(
                    `Invalid Clock state: ${validation.errors.join(', ')}`,
                    'Clock',
                    'load'
                );
            }
        }

        // Handle version migration if needed
        let finalState = state;
        if (opts.migrate && state.version && state.version !== Clock.STATE_VERSION) {
            finalState = this.migrateState(state, state.version);
        }

        // Stop any running clock before loading state
        const wasRunning = this.running;
        if (wasRunning) {
            this.stopLoop();
        }

        // Load configuration
        this.mhz = finalState.mhz;
        this.stepChunk = finalState.stepChunk;

        // Load execution state
        this.running = false; // Will be restarted if needed
        this.paused = finalState.paused;

        // Load timing state
        this.provisionedCycles = finalState.provisionedCycles;
        this.maxedCycles = finalState.maxedCycles;
        this.totalElapsedCycles = finalState.totalElapsedCycles;

        // Load pause management
        this.pausedAt = finalState.pausedAt;
        this.totalPausedTime = finalState.totalPausedTime;

        // Load performance tracking
        this.frameTimeSamples = [...finalState.frameTimeSamples];
        this.driftCompensation = finalState.driftCompensation;
        this.dynamicWaitTime = finalState.dynamicWaitTime;

        // Reset runtime state that's not serialized
        this.startTime = 0;
        this.lastFrameTime = 0;

        // Restart clock if it was running
        if (wasRunning && finalState.running) {
            this.startLoop();
        }
    }

    /**
     * Validate a state object for this component
     */
    validateState(state: unknown): StateValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (typeof state !== 'object' || state === null) {
            errors.push('State must be an object');
            return { valid: false, errors, warnings };
        }

        const s = state as Record<string, unknown>;

        // Required fields validation
        if (typeof s.mhz !== 'number' || s.mhz <= 0) {
            errors.push('mhz must be a positive number');
        }
        if (typeof s.stepChunk !== 'number' || s.stepChunk <= 0) {
            errors.push('stepChunk must be a positive number');
        }
        if (typeof s.running !== 'boolean') {
            errors.push('running must be a boolean');
        }
        if (typeof s.paused !== 'boolean') {
            errors.push('paused must be a boolean');
        }
        if (typeof s.provisionedCycles !== 'number' || s.provisionedCycles < 0) {
            errors.push('provisionedCycles must be a non-negative number');
        }
        if (typeof s.maxedCycles !== 'number' || s.maxedCycles < 0) {
            errors.push('maxedCycles must be a non-negative number');
        }
        if (typeof s.totalElapsedCycles !== 'number' || s.totalElapsedCycles < 0) {
            errors.push('totalElapsedCycles must be a non-negative number');
        }
        if (typeof s.pausedAt !== 'number' || s.pausedAt < 0) {
            errors.push('pausedAt must be a non-negative number');
        }
        if (typeof s.totalPausedTime !== 'number' || s.totalPausedTime < 0) {
            errors.push('totalPausedTime must be a non-negative number');
        }
        if (!Array.isArray(s.frameTimeSamples)) {
            errors.push('frameTimeSamples must be an array');
        } else if (!s.frameTimeSamples.every((t: unknown) => typeof t === 'number' && t >= 0)) {
            errors.push('frameTimeSamples must contain only non-negative numbers');
        }
        if (typeof s.driftCompensation !== 'number' || s.driftCompensation <= 0) {
            errors.push('driftCompensation must be a positive number');
        }
        if (typeof s.dynamicWaitTime !== 'number' || s.dynamicWaitTime < MIN_WAIT_TIME || s.dynamicWaitTime > MAX_WAIT_TIME) {
            errors.push(`dynamicWaitTime must be between ${MIN_WAIT_TIME} and ${MAX_WAIT_TIME}`);
        }

        // Version check
        if (s.version && typeof s.version === 'string') {
            const supportedVersions = this.getSupportedVersions();
            if (s.version !== Clock.STATE_VERSION && !supportedVersions.includes(s.version)) {
                warnings.push(`State version ${s.version} may require migration`);
            }
        }

        // Logical consistency checks
        if (s.paused && !s.running) {
            warnings.push('Clock is marked as paused but not running');
        }
        if (typeof s.pausedAt === 'number' && s.pausedAt > 0 && !s.paused) {
            warnings.push('pausedAt timestamp exists but clock is not paused');
        }

        return { valid: errors.length === 0, errors, warnings };
    }

    /**
     * Reset the component to its initial state
     */
    resetState(): void {
        // Stop any running clock
        if (this.running) {
            this.stopLoop();
        }

        // Reset to constructor defaults
        this.mhz = DEFAULT_MHZ;
        this.stepChunk = DEFAULT_STEP_INTERVAL;
        this.provisionedCycles = 0;
        this.maxedCycles = 0;
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

    /**
     * Get the current schema version for this component's state
     */
    getStateVersion(): string {
        return Clock.STATE_VERSION;
    }

    /**
     * Migrate state from an older version to the current version
     */
    migrateState(oldState: unknown, fromVersion: string): ClockState {
        if (typeof oldState !== 'object' || oldState === null) {
            throw new StateError('Cannot migrate null or non-object state', 'Clock', 'migrate');
        }

        const state = oldState as Record<string, unknown>;

        switch (fromVersion) {
            case '1.0':
                // Version 1.0 -> 2.0 migration
                // Version 1.0 didn't have: frameTimeSamples, driftCompensation, dynamicWaitTime
                return {
                    version: Clock.STATE_VERSION,
                    mhz: state.mhz as number ?? DEFAULT_MHZ,
                    stepChunk: state.stepChunk as number ?? DEFAULT_STEP_INTERVAL,
                    running: state.running as boolean ?? false,
                    paused: state.paused as boolean ?? false,
                    provisionedCycles: state.provisionedCycles as number ?? 0,
                    maxedCycles: state.maxedCycles as number ?? 0,
                    totalElapsedCycles: state.totalElapsedCycles as number ?? 0,
                    pausedAt: state.pausedAt as number ?? 0,
                    totalPausedTime: state.totalPausedTime as number ?? 0,
                    // New fields added in v2.0
                    frameTimeSamples: [],
                    driftCompensation: 1.0,
                    dynamicWaitTime: DEFAULT_WAIT_TIME,
                };

            default:
                throw new StateError(
                    `Unsupported Clock state version: ${fromVersion}`,
                    'Clock',
                    'migrate'
                );
        }
    }

    /**
     * Get list of supported state versions for migration
     */
    getSupportedVersions(): string[] {
        return ['1.0', '2.0'];
    }
}

export default Clock;
