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