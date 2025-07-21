import { LogLevel } from '../types/logging';
import type { LogHandler } from './types';
import { ErrorHandler } from '../core/errors';
export type { LogHandler };

class LoggingService {
    private handlers: LogHandler[] = [];

    addHandler(handler: LogHandler): void {
        this.handlers.push(handler);
    }

    removeHandler(handler: LogHandler): void {
        this.handlers = this.handlers.filter(h => h !== handler);
    }

    log(level: LogLevel, source: string, message: string): void {
        // Always log to console in development
        // Using a simple approach that works in both browser and tests
        const isDev = true; // For now, always log to console
        
        if (isDev) {
            switch (level) {
                case 'info':
                    console.log(`[${source}] ${message}`);
                    break;
                case 'warn':
                    console.warn(`[${source}] ${message}`);
                    break;
                case 'error':
                    console.error(`[${source}] ${message}`);
                    break;
            }
        }


        // Forward to registered handlers (UI)
        this.handlers.forEach(handler => {
            try {
                handler(level, source, message);
            } catch (error) {
                console.error('Error in logging handler:', error);
            }
        });
    }

    info(source: string, message: string): void {
        this.log('info', source, message);
    }

    warn(source: string, message: string): void {
        this.log('warn', source, message);
    }

    error(source: string, message: string): void {
        this.log('error', source, message);
    }
}

// Singleton instance
export const loggingService = new LoggingService();

// Initialize ErrorHandler with LoggingService
ErrorHandler.setLoggingService(loggingService);