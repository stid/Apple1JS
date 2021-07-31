declare interface Clockable {
    getCycles(): number;
    step(): number;
    bulkSteps(steps: number): void;
}
