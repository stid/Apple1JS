/**
 * Interface for classes that can be clocked, providing methods to
 * manage clock cycles and perform operations based on clock steps.
 */
interface IClockable {
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
