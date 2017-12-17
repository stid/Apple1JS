// @flow
import {Clockable} from './flowTypes/Clockable';

const NS_PER_SEC: number = 1e9;
const DEFAULT_MHZ: number = 1;
const DEFAULT_STEP_CHUNK: number = 10;

class Clock {
    +mhz: number;
    +stepChunk: number;
    prevCycleTime: [number, number];
    nanoPerCycle: number;
    lastCycleCount: number;
    +cpu: Clockable;

    constructor(cpu: Clockable, mhz: number = DEFAULT_MHZ, stepChunk: number = DEFAULT_STEP_CHUNK) {
        this.mhz = mhz;
        this.stepChunk = stepChunk;
        this.lastCycleCount = 1;
        this.nanoPerCycle = 1000 / this.mhz;
        this.cpu = cpu;
        this.prevCycleTime = process.hrtime();
    }

    cycle(): void {
        for (let a = 0; a < this.stepChunk; a++) {
            const diff: [number, number] = process.hrtime(this.prevCycleTime);
            const nanoDelta: number = diff[0] * NS_PER_SEC + diff[1];

            if (nanoDelta > this.nanoPerCycle * this.lastCycleCount) {
                this.prevCycleTime = process.hrtime();
                const startCycles: number = this.cpu.getCycles();

                this.cpu.step();

                const endCycles: number = this.cpu.getCycles();
                this.lastCycleCount = endCycles - startCycles;
            }
        }
    }

}

export default Clock;