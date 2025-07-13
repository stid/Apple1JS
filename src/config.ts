import type { Config } from './types/config';

export const CONFIG: Readonly<Config> = Object.freeze({
    CRT_SUPPORT_BS: true,
    USE_COMLINK_WORKER: true, // Comlink is now the only implementation
});
