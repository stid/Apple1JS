import type { Config } from './types/config';

export const CONFIG: Readonly<Config> = Object.freeze({
    CRT_SUPPORT_BS: true,
    USE_COMLINK_WORKER: false, // Set to true to enable Comlink-based worker (experimental)
});
