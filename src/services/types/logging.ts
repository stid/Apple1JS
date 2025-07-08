import type { LogLevel } from '@/types/logging';

/**
 * Handler function for log messages
 */
export type LogHandler = (level: LogLevel, source: string, message: string) => void;