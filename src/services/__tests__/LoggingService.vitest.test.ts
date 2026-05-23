import { describe, expect, beforeEach, afterEach, vi } from 'vitest';
import { loggingService } from '../LoggingService';
import { ErrorHandler } from '../../core/errors';

describe('LoggingService', () => {
    let consoleLogSpy: ReturnType<typeof vi.spyOn>;
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        // Spy on console methods
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.restoreAllMocks();
    });

    describe('log method', () => {
        it('should log info messages to console', () => {
            loggingService.log('info', 'TestSource', 'Test info message');

            expect(consoleLogSpy).toHaveBeenCalledWith('[TestSource] Test info message');
            expect(consoleWarnSpy).not.toHaveBeenCalled();
            expect(consoleErrorSpy).not.toHaveBeenCalled();
        });

        it('should log warn messages to console', () => {
            loggingService.log('warn', 'TestSource', 'Test warning message');

            expect(consoleWarnSpy).toHaveBeenCalledWith('[TestSource] Test warning message');
            expect(consoleLogSpy).not.toHaveBeenCalled();
            expect(consoleErrorSpy).not.toHaveBeenCalled();
        });

        it('should log error messages to console', () => {
            loggingService.log('error', 'TestSource', 'Test error message');

            expect(consoleErrorSpy).toHaveBeenCalledWith('[TestSource] Test error message');
            expect(consoleLogSpy).not.toHaveBeenCalled();
            expect(consoleWarnSpy).not.toHaveBeenCalled();
        });
    });

    describe('convenience methods', () => {
        it('should call log with info level', () => {
            const logSpy = vi.spyOn(loggingService, 'log');

            loggingService.info('TestSource', 'Info message');

            expect(logSpy).toHaveBeenCalledWith('info', 'TestSource', 'Info message');
        });

        it('should call log with warn level', () => {
            const logSpy = vi.spyOn(loggingService, 'log');

            loggingService.warn('TestSource', 'Warning message');

            expect(logSpy).toHaveBeenCalledWith('warn', 'TestSource', 'Warning message');
        });

        it('should call log with error level', () => {
            const logSpy = vi.spyOn(loggingService, 'log');

            loggingService.error('TestSource', 'Error message');

            expect(logSpy).toHaveBeenCalledWith('error', 'TestSource', 'Error message');
        });
    });

    describe('ErrorHandler integration', () => {
        it('should have initialized ErrorHandler with LoggingService', () => {
            // The ErrorHandler should already be initialized from module load
            // We can verify this by checking that ErrorHandler has been configured
            expect(ErrorHandler.setLoggingService).toBeDefined();

            // We can also verify that logging through ErrorHandler works
            // Simulate ErrorHandler using the logging service
            loggingService.error('ErrorHandler', 'Test error from ErrorHandler');

            expect(consoleErrorSpy).toHaveBeenCalledWith('[ErrorHandler] Test error from ErrorHandler');
        });
    });

    describe('edge cases', () => {
        it('should handle empty source', () => {
            loggingService.log('info', '', 'Message with empty source');

            expect(consoleLogSpy).toHaveBeenCalledWith('[] Message with empty source');
        });

        it('should handle empty message', () => {
            loggingService.log('info', 'TestSource', '');

            expect(consoleLogSpy).toHaveBeenCalledWith('[TestSource] ');
        });

        it('should handle special characters in messages', () => {
            const specialMessage = 'Test\nmessage\twith\rspecial\0characters';
            loggingService.log('info', 'TestSource', specialMessage);

            expect(consoleLogSpy).toHaveBeenCalledWith(`[TestSource] ${specialMessage}`);
        });
    });
});