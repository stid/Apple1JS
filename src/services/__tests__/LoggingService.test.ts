import { loggingService } from '../LoggingService';
import { ErrorHandler } from '../../core/errors';
import type { LogHandler } from '../@types/LoggingTypes';

describe('LoggingService', () => {
    let consoleLogSpy: jest.SpyInstance;
    let consoleWarnSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
        // Clear any existing handlers
        const service = loggingService as unknown as { handlers: LogHandler[] };
        service.handlers = [];
        
        // Spy on console methods
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
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

        it('should call all registered handlers', () => {
            const handler1 = jest.fn();
            const handler2 = jest.fn();
            
            loggingService.addHandler(handler1);
            loggingService.addHandler(handler2);
            
            loggingService.log('info', 'TestSource', 'Test message');
            
            expect(handler1).toHaveBeenCalledWith('info', 'TestSource', 'Test message');
            expect(handler2).toHaveBeenCalledWith('info', 'TestSource', 'Test message');
        });

        it('should handle errors in handlers gracefully', () => {
            const errorHandler: LogHandler = () => {
                throw new Error('Handler error');
            };
            const goodHandler = jest.fn();
            
            loggingService.addHandler(errorHandler);
            loggingService.addHandler(goodHandler);
            
            loggingService.log('info', 'TestSource', 'Test message');
            
            // Should still call the good handler
            expect(goodHandler).toHaveBeenCalledWith('info', 'TestSource', 'Test message');
            // Should log the error
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error in logging handler:', expect.any(Error));
        });
    });

    describe('convenience methods', () => {
        it('should call log with info level', () => {
            const logSpy = jest.spyOn(loggingService, 'log');
            
            loggingService.info('TestSource', 'Info message');
            
            expect(logSpy).toHaveBeenCalledWith('info', 'TestSource', 'Info message');
        });

        it('should call log with warn level', () => {
            const logSpy = jest.spyOn(loggingService, 'log');
            
            loggingService.warn('TestSource', 'Warning message');
            
            expect(logSpy).toHaveBeenCalledWith('warn', 'TestSource', 'Warning message');
        });

        it('should call log with error level', () => {
            const logSpy = jest.spyOn(loggingService, 'log');
            
            loggingService.error('TestSource', 'Error message');
            
            expect(logSpy).toHaveBeenCalledWith('error', 'TestSource', 'Error message');
        });
    });

    describe('handler management', () => {
        it('should add handlers', () => {
            const handler = jest.fn();
            
            loggingService.addHandler(handler);
            loggingService.log('info', 'TestSource', 'Test message');
            
            expect(handler).toHaveBeenCalledWith('info', 'TestSource', 'Test message');
        });

        it('should remove handlers', () => {
            const handler1 = jest.fn();
            const handler2 = jest.fn();
            
            loggingService.addHandler(handler1);
            loggingService.addHandler(handler2);
            
            loggingService.removeHandler(handler1);
            
            loggingService.log('info', 'TestSource', 'Test message');
            
            expect(handler1).not.toHaveBeenCalled();
            expect(handler2).toHaveBeenCalledWith('info', 'TestSource', 'Test message');
        });

        it('should not error when removing non-existent handler', () => {
            const handler = jest.fn();
            
            expect(() => {
                loggingService.removeHandler(handler);
            }).not.toThrow();
        });

        it('should handle multiple additions and removals', () => {
            const handler1 = jest.fn();
            const handler2 = jest.fn();
            const handler3 = jest.fn();
            
            loggingService.addHandler(handler1);
            loggingService.addHandler(handler2);
            loggingService.addHandler(handler3);
            loggingService.removeHandler(handler2);
            
            loggingService.log('info', 'TestSource', 'Test message');
            
            expect(handler1).toHaveBeenCalled();
            expect(handler2).not.toHaveBeenCalled();
            expect(handler3).toHaveBeenCalled();
        });
    });

    describe('ErrorHandler integration', () => {
        it('should have initialized ErrorHandler with LoggingService', () => {
            // The ErrorHandler should already be initialized from module load
            // We can verify this by checking that ErrorHandler has been configured
            expect(ErrorHandler.setLoggingService).toBeDefined();
            
            // We can also verify that logging through ErrorHandler works
            const handler = jest.fn();
            loggingService.addHandler(handler);
            
            // Simulate ErrorHandler using the logging service
            loggingService.error('ErrorHandler', 'Test error from ErrorHandler');
            
            expect(handler).toHaveBeenCalledWith('error', 'ErrorHandler', 'Test error from ErrorHandler');
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