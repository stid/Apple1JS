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
 * Error thrown when invalid memory access is attempted
 */
export class MemoryError extends EmulatorError {
    constructor(message: string, public readonly address: number) {
        super(message, 'Memory');
        this.name = 'MemoryError';
        Object.setPrototypeOf(this, MemoryError.prototype);
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

/**
 * Error thrown when CPU encounters an invalid state
 */
export class CPUError extends EmulatorError {
    constructor(message: string) {
        super(message, 'CPU6502');
        this.name = 'CPUError';
        Object.setPrototypeOf(this, CPUError.prototype);
    }
}

/**
 * Error thrown when state serialization/deserialization fails
 */
export class StateError extends EmulatorError {
    constructor(message: string, component: string) {
        super(message, component);
        this.name = 'StateError';
        Object.setPrototypeOf(this, StateError.prototype);
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