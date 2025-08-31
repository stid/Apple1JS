/* tslint:disable */
/* eslint-disable */
/**
 * Initialize the WASM module
 */
export function init(): void;
/**
 * 6502 CPU implementation
 */
export class CPU6502 {
  free(): void;
  /**
   * Create a new CPU instance
   */
  constructor();
  /**
   * Reset the CPU
   */
  reset(): void;
  /**
   * Execute a single instruction
   */
  step(): number;
  /**
   * Execute multiple cycles
   */
  step_cycles(target_cycles: number): number;
  /**
   * Save CPU state
   */
  save_state(): any;
  /**
   * Load CPU state
   */
  load_state(state: any): void;
  /**
   * Read a byte from memory
   */
  read_memory(address: number): number;
  /**
   * Write a byte to memory
   */
  write_memory(address: number, value: number): void;
  /**
   * Read a range of memory
   */
  read_memory_range(start: number, length: number): Uint8Array;
  /**
   * Write a range of memory
   */
  write_memory_range(start: number, data: Uint8Array): void;
  /**
   * Get a pointer to the memory array (for SharedArrayBuffer)
   */
  memory_ptr(): number;
  /**
   * Get performance metrics
   */
  get_metrics(): any;
  /**
   * Reset metrics
   */
  reset_metrics(): void;
  /**
   * Trigger IRQ
   */
  trigger_irq(): void;
  /**
   * Clear IRQ
   */
  clear_irq(): void;
  /**
   * Trigger NMI
   */
  trigger_nmi(): void;
  pc: number;
  a: number;
  x: number;
  y: number;
  s: number;
  status: number;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly init: () => void;
  readonly __wbg_cpu6502_free: (a: number, b: number) => void;
  readonly cpu6502_new: () => number;
  readonly cpu6502_reset: (a: number) => void;
  readonly cpu6502_step: (a: number) => number;
  readonly cpu6502_step_cycles: (a: number, b: number) => number;
  readonly cpu6502_save_state: (a: number) => any;
  readonly cpu6502_load_state: (a: number, b: any) => void;
  readonly cpu6502_pc: (a: number) => number;
  readonly cpu6502_set_pc: (a: number, b: number) => void;
  readonly cpu6502_a: (a: number) => number;
  readonly cpu6502_set_a: (a: number, b: number) => void;
  readonly cpu6502_x: (a: number) => number;
  readonly cpu6502_set_x: (a: number, b: number) => void;
  readonly cpu6502_y: (a: number) => number;
  readonly cpu6502_set_y: (a: number, b: number) => void;
  readonly cpu6502_s: (a: number) => number;
  readonly cpu6502_set_s: (a: number, b: number) => void;
  readonly cpu6502_status: (a: number) => number;
  readonly cpu6502_set_status: (a: number, b: number) => void;
  readonly cpu6502_read_memory: (a: number, b: number) => number;
  readonly cpu6502_write_memory: (a: number, b: number, c: number) => void;
  readonly cpu6502_read_memory_range: (a: number, b: number, c: number) => [number, number];
  readonly cpu6502_write_memory_range: (a: number, b: number, c: number, d: number) => void;
  readonly cpu6502_memory_ptr: (a: number) => number;
  readonly cpu6502_get_metrics: (a: number) => any;
  readonly cpu6502_reset_metrics: (a: number) => void;
  readonly cpu6502_trigger_irq: (a: number) => void;
  readonly cpu6502_clear_irq: (a: number) => void;
  readonly cpu6502_trigger_nmi: (a: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_export_2: WebAssembly.Table;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
