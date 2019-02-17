// @flow
export interface Clockable {
    getCycles(): number;
    step(): number;
}
