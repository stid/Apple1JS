import { LogLevel } from '../types/logging';
import type { LogHandler } from './@types/LoggingTypes';
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
        // Always log to console for debugging
        // In workers, import.meta might not be available, so default to logging
        let isDev = true;
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const meta = import.meta as any;
            if (meta && meta.env && typeof meta.env.DEV === 'boolean') {
                isDev = meta.env.DEV;
            }
        } catch {
            // If import.meta is not available (e.g., in worker), default to true
            isDev = true;
        }
        
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