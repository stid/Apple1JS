/**
 * Custom error types for the Apple1JS emulator
 */

/**
 * Base error class for all emulator errors
 */
export class EmulatorError extends Error {
    constructor(message: string, public readonly component: string) {
        super(message);
        this.name = 'EmulatorError';
        Object.setPrototypeOf(this, EmulatorError.prototype);
    }
}

/**
 * Error thrown when bus configuration is invalid
 */
export class BusError extends EmulatorError {
    constructor(message: string) {
        super(message, 'Bus');
        this.name = 'BusError';
        Object.setPrototypeOf(this, BusError.prototype);
    }
}

interface LoggingService {
    error(source: string, message: string): void;
}

/**
 * Error handler utility for consistent error handling
 */
export class ErrorHandler {
    private static loggingService: LoggingService | null = null;

    static setLoggingService(service: LoggingService): void {
        ErrorHandler.loggingService = service;
    }

    static handle(error: Error, recoverable = true): void {
        if (ErrorHandler.loggingService) {
            const errorMessage = error instanceof EmulatorError
                ? `[${error.component}] ${error.message}`
                : error.message;
            
            ErrorHandler.loggingService.error('ErrorHandler', errorMessage);
        } else {
            // No logging service registered yet: the console is the only sink left.
            // eslint-disable-next-line no-console
            console.error(error);
        }

        if (!recoverable) {
            throw error;
        }
    }

    static handleAsync<T>(promise: Promise<T>): Promise<T> {
        return promise.catch(error => {
            ErrorHandler.handle(error);
            throw error;
        });
    }
}