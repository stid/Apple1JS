/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */
/* global global */

import { WORKER_MESSAGES } from '../TSTypes';
import type { WorkerMessage } from '../TSTypes';
import type { EmulatorState } from '../TSTypes';

describe('Apple.worker', () => {
    let mockApple1: any;
    let mockVideo: any;
    let mockKeyboard: any;
    let mockLoggingService: any;
    let onMessageHandler: ((event: MessageEvent<WorkerMessage>) => void) | null = null;
    let mockPostMessage: jest.Mock;
    let mockSetInterval: jest.Mock;
    let mockClearInterval: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Reset onmessage handler
        onMessageHandler = null;
        
        // Mock postMessage globally
        mockPostMessage = jest.fn();
        (global as any).postMessage = mockPostMessage;
        
        // Mock setInterval and clearInterval
        mockSetInterval = jest.fn().mockReturnValue(123);
        mockClearInterval = jest.fn();
        (global as any).setInterval = mockSetInterval as any;
        (global as any).clearInterval = mockClearInterval;
        
        // Mock the imported modules
        mockVideo = {
            subscribe: jest.fn(),
            setSupportBS: jest.fn(),
            forceUpdate: jest.fn()
        };
        
        mockKeyboard = {
            write: jest.fn()
        };
        
        mockApple1 = {
            cpu: {
                PC: 0x0000,
                setExecutionHook: jest.fn(),
                performSingleStep: jest.fn(),
                toDebug: jest.fn().mockReturnValue({ 
                    PC: 0x0000, A: 0, X: 0, Y: 0, S: 0,
                    REG_PC: '$0000', REG_A: '$00', REG_X: '$00', REG_Y: '$00', REG_S: '$00',
                    FLAG_N: 'CLR', FLAG_Z: 'CLR', FLAG_C: 'CLR', FLAG_V: 'CLR', FLAG_I: 'CLR', FLAG_D: 'CLR'
                }),
                setProfilingEnabled: jest.fn(),
                setCycleAccurateMode: jest.fn()
            },
            clock: {
                pause: jest.fn(),
                resume: jest.fn(),
                resetTiming: jest.fn(),
                toDebug: jest.fn().mockReturnValue({ paused: false })
            },
            pia: {
                toDebug: jest.fn().mockReturnValue({ portA: 0, portB: 0 })
            },
            bus: {
                toDebug: jest.fn().mockReturnValue({ lastRead: 0, lastWrite: 0 }),
                read: jest.fn().mockImplementation((addr) => addr & 0xFF)
            },
            saveState: jest.fn().mockReturnValue({ cpu: {}, memory: {} }),
            loadState: jest.fn(),
            startLoop: jest.fn()
        };
        
        mockLoggingService = {
            addHandler: jest.fn(),
            log: jest.fn()
        };
        
        // Setup mocks
        jest.doMock('../WebCRTVideo', () => ({
            __esModule: true,
            default: jest.fn(() => mockVideo)
        }));
        
        jest.doMock('../WebKeyboard', () => ({
            __esModule: true,
            default: jest.fn(() => mockKeyboard)
        }));
        
        jest.doMock('../index', () => ({
            __esModule: true,
            default: jest.fn(() => mockApple1)
        }));
        
        jest.doMock('../../services/LoggingService', () => ({
            loggingService: mockLoggingService
        }));
        
        // Capture onmessage handler
        Object.defineProperty(global as any, 'onmessage', {
            set: (handler) => { onMessageHandler = handler; },
            get: () => onMessageHandler,
            configurable: true
        });
        
        // Clear module cache and re-import worker
        jest.resetModules();
        require('../Apple.worker');
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.resetModules();
    });

    describe('initialization', () => {
        it('should set up video subscription', () => {
            expect(mockVideo.subscribe).toHaveBeenCalledWith(expect.any(Function));
            
            // Test video subscription callback
            const videoCallback = mockVideo.subscribe.mock.calls[0][0];
            const videoData = { buffer: new Uint8Array([1, 2, 3]), row: 0, column: 0 };
            videoCallback(videoData);
            
            expect(mockPostMessage).toHaveBeenCalledWith({
                data: { buffer: videoData.buffer, row: 0, column: 0 },
                type: WORKER_MESSAGES.UPDATE_VIDEO_BUFFER
            });
        });

        it('should set up logging handler', () => {
            expect(mockLoggingService.addHandler).toHaveBeenCalledWith(expect.any(Function));
            
            // Test logging handler
            const logHandler = mockLoggingService.addHandler.mock.calls[0][0];
            logHandler('info', 'TestSource', 'Test message');
            
            expect(mockPostMessage).toHaveBeenCalledWith({
                data: { level: 'info', source: 'TestSource', message: 'Test message' },
                type: WORKER_MESSAGES.LOG_MESSAGE
            });
        });

        it('should start the emulation loop', () => {
            expect(mockApple1.startLoop).toHaveBeenCalled();
        });

        it('should initialize breakpoint hook', () => {
            expect(mockApple1.cpu.setExecutionHook).toHaveBeenCalled();
        });
    });

    describe('message handling', () => {
        const sendMessage = (type: number, data?: any) => {
            if (onMessageHandler) {
                onMessageHandler(new MessageEvent('message', { data: { type, data } }));
            }
        };

        it('should handle SET_CRT_BS_SUPPORT_FLAG', () => {
            sendMessage(WORKER_MESSAGES.SET_CRT_BS_SUPPORT_FLAG, true);
            expect(mockVideo.setSupportBS).toHaveBeenCalledWith(true);
            
            mockVideo.setSupportBS.mockClear();
            sendMessage(WORKER_MESSAGES.SET_CRT_BS_SUPPORT_FLAG, false);
            expect(mockVideo.setSupportBS).toHaveBeenCalledWith(false);
        });

        it('should handle KEY_DOWN', () => {
            sendMessage(WORKER_MESSAGES.KEY_DOWN, 'A');
            expect(mockKeyboard.write).toHaveBeenCalledWith('A');
            
            // Should ignore non-string data
            mockKeyboard.write.mockClear();
            sendMessage(WORKER_MESSAGES.KEY_DOWN, 123);
            expect(mockKeyboard.write).not.toHaveBeenCalled();
        });

        it('should handle DEBUG_INFO request', () => {
            sendMessage(WORKER_MESSAGES.DEBUG_INFO);
            
            expect(mockPostMessage).toHaveBeenCalledWith({
                data: {
                    cpu: mockApple1.cpu.toDebug(),
                    pia: mockApple1.pia.toDebug(),
                    Bus: mockApple1.bus.toDebug(),
                    clock: mockApple1.clock.toDebug()
                },
                type: WORKER_MESSAGES.DEBUG_INFO
            });
        });

        it('should handle SAVE_STATE', () => {
            const mockState = { cpu: { PC: 0x1000 }, memory: [0, 1, 2] };
            mockApple1.saveState.mockReturnValue(mockState);
            
            sendMessage(WORKER_MESSAGES.SAVE_STATE);
            
            expect(mockApple1.saveState).toHaveBeenCalled();
            expect(mockPostMessage).toHaveBeenCalledWith({
                data: mockState,
                type: WORKER_MESSAGES.STATE_DATA
            });
        });

        it('should handle LOAD_STATE', () => {
            const mockState: EmulatorState = {
                cpu: { PC: 0x2000 } as any,
                pia: {} as any,
                ram: []
            };
            
            sendMessage(WORKER_MESSAGES.LOAD_STATE, mockState);
            
            expect(mockApple1.loadState).toHaveBeenCalled();
            expect(mockApple1.clock.resetTiming).toHaveBeenCalled();
            expect(mockApple1.startLoop).toHaveBeenCalled();
            expect(mockVideo.forceUpdate).toHaveBeenCalled();
        });

        it('should handle PAUSE_EMULATION', () => {
            sendMessage(WORKER_MESSAGES.PAUSE_EMULATION);
            
            expect(mockApple1.clock.pause).toHaveBeenCalled();
            expect(mockPostMessage).toHaveBeenCalledWith({
                data: 'paused',
                type: WORKER_MESSAGES.EMULATION_STATUS
            });
        });

        it('should handle RESUME_EMULATION', () => {
            sendMessage(WORKER_MESSAGES.RESUME_EMULATION);
            
            expect(mockApple1.clock.resume).toHaveBeenCalled();
            expect(mockPostMessage).toHaveBeenCalledWith({
                data: 'running',
                type: WORKER_MESSAGES.EMULATION_STATUS
            });
        });

        it('should handle GET_MEMORY_RANGE', () => {
            const request = { start: 0x0000, length: 4 };
            sendMessage(WORKER_MESSAGES.GET_MEMORY_RANGE, request);
            
            expect(mockApple1.bus.read).toHaveBeenCalledTimes(4);
            expect(mockPostMessage).toHaveBeenCalledWith({
                data: {
                    start: 0x0000,
                    data: [0, 1, 2, 3]
                },
                type: WORKER_MESSAGES.MEMORY_RANGE_DATA
            });
        });

        it('should handle SET_CPU_PROFILING', () => {
            sendMessage(WORKER_MESSAGES.SET_CPU_PROFILING, true);
            expect(mockApple1.cpu.setProfilingEnabled).toHaveBeenCalledWith(true);
            
            sendMessage(WORKER_MESSAGES.SET_CPU_PROFILING, false);
            expect(mockApple1.cpu.setProfilingEnabled).toHaveBeenCalledWith(false);
        });

        it('should handle SET_CYCLE_ACCURATE_TIMING', () => {
            sendMessage(WORKER_MESSAGES.SET_CYCLE_ACCURATE_TIMING, true);
            expect(mockApple1.cpu.setCycleAccurateMode).toHaveBeenCalledWith(true);
            
            sendMessage(WORKER_MESSAGES.SET_CYCLE_ACCURATE_TIMING, false);
            expect(mockApple1.cpu.setCycleAccurateMode).toHaveBeenCalledWith(false);
        });

        it('should handle STEP', () => {
            sendMessage(WORKER_MESSAGES.STEP);
            
            expect(mockApple1.clock.pause).toHaveBeenCalled();
            expect(mockApple1.cpu.performSingleStep).toHaveBeenCalled();
            expect(mockPostMessage).toHaveBeenCalledWith({
                data: {
                    cpu: mockApple1.cpu.toDebug(),
                    pia: mockApple1.pia.toDebug(),
                    Bus: mockApple1.bus.toDebug(),
                    clock: mockApple1.clock.toDebug()
                },
                type: WORKER_MESSAGES.DEBUG_INFO
            });
        });

        it('should handle GET_EMULATION_STATUS', () => {
            // Test when running
            sendMessage(WORKER_MESSAGES.GET_EMULATION_STATUS);
            expect(mockPostMessage).toHaveBeenCalledWith({
                data: 'running',
                type: WORKER_MESSAGES.EMULATION_STATUS
            });
            
            // Test when paused
            mockPostMessage.mockClear();
            sendMessage(WORKER_MESSAGES.PAUSE_EMULATION);
            mockPostMessage.mockClear();
            sendMessage(WORKER_MESSAGES.GET_EMULATION_STATUS);
            expect(mockPostMessage).toHaveBeenCalledWith({
                data: 'paused',
                type: WORKER_MESSAGES.EMULATION_STATUS
            });
        });
    });

    describe('breakpoint management', () => {
        const sendMessage = (type: number, data?: any) => {
            if (onMessageHandler) {
                onMessageHandler(new MessageEvent('message', { data: { type, data } }));
            }
        };

        it('should handle SET_BREAKPOINT', () => {
            sendMessage(WORKER_MESSAGES.SET_BREAKPOINT, 0x1000);
            
            expect(mockApple1.cpu.setExecutionHook).toHaveBeenCalled();
            expect(mockPostMessage).toHaveBeenCalledWith({
                data: [0x1000],
                type: WORKER_MESSAGES.BREAKPOINTS_DATA
            });
        });

        it('should handle CLEAR_BREAKPOINT', () => {
            // Set a breakpoint first
            sendMessage(WORKER_MESSAGES.SET_BREAKPOINT, 0x1000);
            mockPostMessage.mockClear();
            
            sendMessage(WORKER_MESSAGES.CLEAR_BREAKPOINT, 0x1000);
            
            expect(mockPostMessage).toHaveBeenCalledWith({
                data: [],
                type: WORKER_MESSAGES.BREAKPOINTS_DATA
            });
        });

        it('should handle CLEAR_ALL_BREAKPOINTS', () => {
            // Set multiple breakpoints
            sendMessage(WORKER_MESSAGES.SET_BREAKPOINT, 0x1000);
            sendMessage(WORKER_MESSAGES.SET_BREAKPOINT, 0x2000);
            mockPostMessage.mockClear();
            
            sendMessage(WORKER_MESSAGES.CLEAR_ALL_BREAKPOINTS);
            
            expect(mockPostMessage).toHaveBeenCalledWith({
                data: [],
                type: WORKER_MESSAGES.BREAKPOINTS_DATA
            });
        });

        it('should handle GET_BREAKPOINTS', () => {
            sendMessage(WORKER_MESSAGES.SET_BREAKPOINT, 0x1000);
            sendMessage(WORKER_MESSAGES.SET_BREAKPOINT, 0x2000);
            mockPostMessage.mockClear();
            
            sendMessage(WORKER_MESSAGES.GET_BREAKPOINTS);
            
            expect(mockPostMessage).toHaveBeenCalledWith({
                data: expect.arrayContaining([0x1000, 0x2000]),
                type: WORKER_MESSAGES.BREAKPOINTS_DATA
            });
        });

        it('should detect breakpoint hits during execution', () => {
            sendMessage(WORKER_MESSAGES.SET_BREAKPOINT, 0x1000);
            
            // Get the execution hook that was set
            const executionHookCalls = mockApple1.cpu.setExecutionHook.mock.calls;
            const executionHook = executionHookCalls[executionHookCalls.length - 1][0];
            
            // Simulate hitting the breakpoint
            mockApple1.cpu.PC = 0x1000;
            const shouldContinue = executionHook(0x1000);
            
            expect(shouldContinue).toBe(false);
            expect(mockApple1.clock.pause).toHaveBeenCalled();
            expect(mockPostMessage).toHaveBeenCalledWith({
                data: 'paused',
                type: WORKER_MESSAGES.EMULATION_STATUS
            });
            expect(mockPostMessage).toHaveBeenCalledWith({
                data: 0x1000,
                type: WORKER_MESSAGES.BREAKPOINT_HIT
            });
        });
    });

    describe('debugger state management', () => {
        const sendMessage = (type: number, data?: any) => {
            if (onMessageHandler) {
                onMessageHandler(new MessageEvent('message', { data: { type, data } }));
            }
        };

        it('should handle SET_DEBUGGER_ACTIVE', () => {
            // Activate debugger
            sendMessage(WORKER_MESSAGES.SET_DEBUGGER_ACTIVE, true);
            expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 250);
            
            // Test the interval callback
            const intervalCallback = mockSetInterval.mock.calls[0][0];
            intervalCallback();
            // The message should contain the full toDebug() output
            expect(mockPostMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: WORKER_MESSAGES.DEBUG_DATA,
                    data: expect.objectContaining({
                        cpu: expect.objectContaining({
                            PC: 0x0000,
                            A: 0,
                            X: 0,
                            Y: 0,
                            REG_PC: '$0000',
                            REG_A: '$00',
                            REG_X: '$00',
                            REG_Y: '$00'
                        })
                    })
                })
            );
            
            // Deactivate debugger
            mockSetInterval.mockClear();
            sendMessage(WORKER_MESSAGES.SET_DEBUGGER_ACTIVE, false);
            expect(mockClearInterval).toHaveBeenCalled();
        });

        it('should use faster interval when paused', () => {
            sendMessage(WORKER_MESSAGES.PAUSE_EMULATION);
            mockSetInterval.mockClear();
            
            sendMessage(WORKER_MESSAGES.SET_DEBUGGER_ACTIVE, true);
            expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 100);
        });
    });

    describe('run to address', () => {
        const sendMessage = (type: number, data?: any) => {
            if (onMessageHandler) {
                onMessageHandler(new MessageEvent('message', { data: { type, data } }));
            }
        };

        it('should handle RUN_TO_ADDRESS', () => {
            mockApple1.cpu.PC = 0x0000;
            sendMessage(WORKER_MESSAGES.RUN_TO_ADDRESS, 0x2000);
            
            expect(mockApple1.cpu.setExecutionHook).toHaveBeenCalled();
            expect(mockPostMessage).toHaveBeenCalledWith({
                data: 0x2000,
                type: WORKER_MESSAGES.RUN_TO_CURSOR_TARGET
            });
            expect(mockLoggingService.log).toHaveBeenCalledWith(
                'info',
                'RunToAddress',
                'Running to address $2000'
            );
        });

        it('should not run if already at target address', () => {
            mockApple1.cpu.PC = 0x2000;
            sendMessage(WORKER_MESSAGES.RUN_TO_ADDRESS, 0x2000);
            
            expect(mockApple1.clock.resume).not.toHaveBeenCalled();
            expect(mockLoggingService.log).toHaveBeenCalledWith(
                'info',
                'RunToAddress',
                'Already at target address $2000'
            );
        });

        it('should pause when reaching target address', () => {
            mockApple1.cpu.PC = 0x0000;
            sendMessage(WORKER_MESSAGES.RUN_TO_ADDRESS, 0x2000);
            
            // Get the execution hook that was set
            const executionHookCalls = mockApple1.cpu.setExecutionHook.mock.calls;
            const executionHook = executionHookCalls[executionHookCalls.length - 1][0];
            
            // Simulate reaching the target
            const shouldContinue = executionHook(0x2000);
            
            expect(shouldContinue).toBe(false);
            expect(mockApple1.clock.pause).toHaveBeenCalled();
            expect(mockPostMessage).toHaveBeenCalledWith({
                data: 'paused',
                type: WORKER_MESSAGES.EMULATION_STATUS
            });
            expect(mockPostMessage).toHaveBeenCalledWith({
                data: null,
                type: WORKER_MESSAGES.RUN_TO_CURSOR_TARGET
            });
        });
    });

    describe('edge cases', () => {
        const sendMessage = (type: number, data?: any) => {
            if (onMessageHandler) {
                onMessageHandler(new MessageEvent('message', { data: { type, data } }));
            }
        };

        it('should handle messages with invalid type', () => {
            expect(() => {
                if (onMessageHandler) {
                    // Message with no type
                    onMessageHandler(new MessageEvent('message', { data: {} as any }));
                    
                    // Message with non-numeric type
                    onMessageHandler(new MessageEvent('message', { data: { type: 'invalid' } as any }));
                    
                    // No message data
                    onMessageHandler(new MessageEvent('message', { data: null as any }));
                }
            }).not.toThrow();
        });

        it('should handle memory range request with invalid addresses', () => {
            const request = { start: -100, length: 5 };
            sendMessage(WORKER_MESSAGES.GET_MEMORY_RANGE, request);
            
            expect(mockPostMessage).toHaveBeenCalledWith({
                data: {
                    start: -100,
                    data: [0, 0, 0, 0, 0] // All zeros for invalid addresses
                },
                type: WORKER_MESSAGES.MEMORY_RANGE_DATA
            });
        });

        it('should handle memory range request beyond 0xFFFF', () => {
            const request = { start: 0xFFFE, length: 5 };
            sendMessage(WORKER_MESSAGES.GET_MEMORY_RANGE, request);
            
            expect(mockPostMessage).toHaveBeenCalledWith({
                data: {
                    start: 0xFFFE,
                    data: [0xFE, 0xFF, 0, 0, 0] // Valid for first two, zeros for out of range
                },
                type: WORKER_MESSAGES.MEMORY_RANGE_DATA
            });
        });

        it('should handle stepping after hitting a breakpoint', () => {
            // Set a breakpoint
            sendMessage(WORKER_MESSAGES.SET_BREAKPOINT, 0x1000);
            mockApple1.cpu.PC = 0x1000;
            
            // Step should bypass the breakpoint
            sendMessage(WORKER_MESSAGES.STEP);
            
            expect(mockApple1.cpu.performSingleStep).toHaveBeenCalled();
            expect(mockApple1.clock.pause).toHaveBeenCalled();
        });
    });
});