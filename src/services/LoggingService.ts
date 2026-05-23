import { LogLevel } from '../types/logging';
import { ErrorHandler } from '../core/errors';

/**
 * Simple logging service that proxies to console
 *
 * This abstraction allows for:
 * - Consistent log formatting across the application
 * - Easy testing by mocking the service
 * - Future extensibility (e.g., remote logging, filtering)
 */
class LoggingService {
    log(level: LogLevel, source: string, message: string): void {
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