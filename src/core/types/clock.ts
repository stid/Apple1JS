/**
 * Clock and timing type definitions
 */

/**
 * Interface for components that can be clocked
 */
export interface IClockable {
    /**
     * Returns the total number of completed clock cycles.
     * @return {number} The total number of clock cycles.
     */
    getCompletedCycles(): number;

    /**
     * Advances the clock cycle by one step and performs any related
     * operations in the implementing object.
     * @return {number} The updated clock cycle count.
     */
    performSingleStep(): number;

    /**
     * Advances the clock cycle by a specified number of steps and
     * performs any related operations in the implementing object.
     * @param {number} steps The number of clock steps to advance.
     */
    performBulkSteps(steps: number): void;
}

/**
 * Timing statistics for the Clock component
 */
export interface TimingStats {
    actualFrequency: number;
    targetFrequency: number;
    drift: number;
    avgCycleTime: number;
    totalCycles: number;
    totalTime: number;
}