import type { CPU6502State } from '../../core/@types/CPU6502State';
import type { VideoBuffer } from '../TSTypes';

/**
 * State of a single RAM bank
 */
export interface RAMBankState {
    id: string;
    state: { data: number[] };
}

/**
 * State of the PIA (Peripheral Interface Adapter) 6820
 */
export interface PIAState {
    version?: string;
    ora: number;
    orb: number;
    ddra: number;
    ddrb: number;
    cra: number;
    crb: number;
    controlLines: {
        ca1: boolean;
        ca2: boolean;
        cb1: boolean;
        cb2: boolean;
        prevCa1: boolean;
        prevCa2: boolean;
        prevCb1: boolean;
        prevCb2: boolean;
    };
}

/**
 * State of the video display
 */
export interface VideoState {
    buffer: VideoBuffer;
    row: number;
    column: number;
    rowShift?: number;
}

/**
 * Complete emulator state for save/load operations
 */
export interface EmulatorState {
    ram: RAMBankState[];
    cpu: CPU6502State;
    pia: PIAState;
    video?: VideoState;
}