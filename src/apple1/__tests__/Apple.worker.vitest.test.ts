import { describe, expect, beforeEach, afterEach, vi } from 'vitest';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { WORKER_MESSAGES } from '../TSTypes';

// Use manual mock
vi.mock('../Apple.worker');

describe('Apple.worker', () => {
    let workerModule: any;
    let mockVideo: any;
    let mockKeyboard: any;
    let mockApple1: any;
    let mockPostMessage: any;
    let mockSetInterval: any;
    let mockClearInterval: any;

    beforeEach(async () => {
        // Reset modules to get fresh mock
        vi.resetModules();
        
        // Import the mocked worker module
        workerModule = await import('../Apple.worker');
        
        // Get references to the mocked objects
        mockVideo = workerModule.video;
        mockKeyboard = workerModule.keyboard;
        mockApple1 = workerModule.__mocks__.apple1;
        mockPostMessage = workerModule.__mocks__.postMessage;
        mockSetInterval = workerModule.__mocks__.setInterval;
        mockClearInterval = workerModule.__mocks__.clearInterval;
        
        // Note: Don't clear mocks here as initialization tests need to see the setup calls
    });

    afterEach(() => {
        // Reset the mock worker
        if (workerModule?.__mocks__?.resetMockWorker) {
            workerModule.__mocks__.resetMockWorker();
        }
        vi.restoreAllMocks();
    });

    function sendMessage(type: WORKER_MESSAGES, data?: any) {
        const message = { type, data };
        
        // Use the mock worker's message handler
        if (workerModule?.__mocks__?.handleMessage) {
            workerModule.__mocks__.handleMessage(message);
        }
    }

    describe('initialization', () => {
        it('should create video and keyboard instances', () => {
            expect(mockVideo).toBeDefined();
            expect(mockKeyboard).toBeDefined();
            expect(mockApple1).toBeDefined();
        });

        it('should set up video subscription', () => {
            expect(mockVideo.subscribe).toHaveBeenCalledWith(expect.any(Function));
        });

        it('should start the emulation loop', () => {
            expect(mockApple1.startLoop).toHaveBeenCalled();
        });

        it('should initialize breakpoint hook', () => {
            expect(mockApple1.cpu.setExecutionHook).toHaveBeenCalled();
        });
    });

    describe('message handling', () => {
        beforeEach(() => {
            // Clear mocks for message handling tests
            vi.clearAllMocks();
        });

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
            sendMessage(WORKER_MESSAGES.KEY_DOWN, 123);
            expect(mockKeyboard.write).toHaveBeenCalledTimes(1); // Still just the first call
        });

        it('should handle DEBUG_INFO request', () => {
            sendMessage(WORKER_MESSAGES.DEBUG_INFO);
            
            expect(mockPostMessage).toHaveBeenCalledWith({
                data: {
                    cpu: mockApple1.cpu.toDebug(),
                    clock: mockApple1.clock.toDebug(),
                    pia: mockApple1.pia.toDebug(),
                    Bus: mockApple1.bus.toDebug()
                },
                type: WORKER_MESSAGES.DEBUG_INFO
            });
        });

        it('should handle SAVE_STATE', () => {
            sendMessage(WORKER_MESSAGES.SAVE_STATE);
            
            expect(mockApple1.saveState).toHaveBeenCalled();
            expect(mockPostMessage).toHaveBeenCalledWith({
                data: expect.any(Object),
                type: WORKER_MESSAGES.STATE_DATA
            });
        });

        it('should handle LOAD_STATE', () => {
            const mockState = { 
                ram: [], 
                cpu: mockApple1.cpu.toDebug(), 
                pia: { ora: 0, orb: 0, ddra: 0, ddrb: 0, cra: 0, crb: 0, controlLines: { ca1: false, ca2: false, cb1: false, cb2: false, prevCa1: false, prevCa2: false, prevCb1: false, prevCb2: false } } 
            };
            
            sendMessage(WORKER_MESSAGES.LOAD_STATE, mockState);
            
            expect(mockApple1.loadState).toHaveBeenCalledWith(mockState);
            expect(mockApple1.clock.resetTiming).toHaveBeenCalled();
            expect(mockApple1.startLoop).toHaveBeenCalled();
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
            const request = { start: 0x1000, length: 4 };
            sendMessage(WORKER_MESSAGES.GET_MEMORY_RANGE, request);
            
            expect(mockApple1.bus.read).toHaveBeenCalledTimes(4);
            expect(mockPostMessage).toHaveBeenCalledWith({
                data: {
                    start: 0x1000,
                    data: [0x00, 0x01, 0x02, 0x03] // Based on mock implementation
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
                data: 'stepped',
                type: WORKER_MESSAGES.EMULATION_STATUS
            });
        });

        it('should handle GET_EMULATION_STATUS', () => {
            // Test when running (default state)
            sendMessage(WORKER_MESSAGES.GET_EMULATION_STATUS);
            expect(mockPostMessage).toHaveBeenCalledWith({
                data: 'running',
                type: WORKER_MESSAGES.EMULATION_STATUS
            });
            
            // Test when paused
            mockPostMessage.mockClear();
            sendMessage(WORKER_MESSAGES.PAUSE_EMULATION);
            sendMessage(WORKER_MESSAGES.GET_EMULATION_STATUS);
            expect(mockPostMessage).toHaveBeenCalledWith({
                data: 'paused',
                type: WORKER_MESSAGES.EMULATION_STATUS
            });
        });
    });

    describe('breakpoint management', () => {
        beforeEach(() => {
            // Clear mocks for breakpoint management tests
            vi.clearAllMocks();
        });

        it('should handle SET_BREAKPOINT', () => {
            // Clear previous calls from initialization
            mockApple1.cpu.setExecutionHook.mockClear();
            mockPostMessage.mockClear();
            
            sendMessage(WORKER_MESSAGES.SET_BREAKPOINT, 0x1000);
            
            expect(mockApple1.cpu.setExecutionHook).toHaveBeenCalled();
            expect(mockPostMessage).toHaveBeenCalledWith({
                data: [0x1000],
                type: WORKER_MESSAGES.BREAKPOINTS_DATA
            });
        });

        it('should handle CLEAR_BREAKPOINT', () => {
            // First set a breakpoint
            sendMessage(WORKER_MESSAGES.SET_BREAKPOINT, 0x1000);
            mockPostMessage.mockClear();
            
            // Then clear it
            sendMessage(WORKER_MESSAGES.CLEAR_BREAKPOINT, 0x1000);
            
            expect(mockPostMessage).toHaveBeenCalledWith({
                data: [],
                type: WORKER_MESSAGES.BREAKPOINTS_DATA
            });
        });

        it('should handle CLEAR_ALL_BREAKPOINTS', () => {
            // Set some breakpoints first
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
            // Set some breakpoints first
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
            // Set a breakpoint
            sendMessage(WORKER_MESSAGES.SET_BREAKPOINT, 0x1000);
            
            // Get the current execution hook
            const executionHook = workerModule.__mocks__.getCurrentExecutionHook();
            expect(executionHook).toBeDefined();
            
            // Simulate hitting the breakpoint
            mockPostMessage.mockClear();
            mockApple1.cpu.PC = 0x1000;
            
            const shouldPause = executionHook(0x1000);
            expect(shouldPause).toBe(true);
            expect(mockPostMessage).toHaveBeenCalledWith({
                data: 'breakpoint',
                type: WORKER_MESSAGES.EMULATION_STATUS
            });
        });
    });

    describe('debugger state management', () => {
        beforeEach(() => {
            // Clear mocks for debugger state management tests
            vi.clearAllMocks();
        });

        it('should handle SET_DEBUGGER_ACTIVE', () => {
            // Activate debugger
            sendMessage(WORKER_MESSAGES.SET_DEBUGGER_ACTIVE, true);
            expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 250);
            
            // Test the interval callback
            const intervalCallback = mockSetInterval.mock.calls[0][0];
            
            intervalCallback();
            expect(mockPostMessage).toHaveBeenCalledWith({
                data: {
                    cpu: mockApple1.cpu.toDebug(),
                    clock: mockApple1.clock.toDebug(),
                    pia: mockApple1.pia.toDebug(),
                    Bus: mockApple1.bus.toDebug()
                },
                type: WORKER_MESSAGES.DEBUG_INFO
            });
            
            // Deactivate debugger (should clear the interval that was set)
            sendMessage(WORKER_MESSAGES.SET_DEBUGGER_ACTIVE, false);
            expect(mockClearInterval).toHaveBeenCalled();
        });

        it('should use faster interval when paused', () => {
            // First pause the emulation
            sendMessage(WORKER_MESSAGES.PAUSE_EMULATION);
            
            // Clear the setInterval calls from previous operations
            mockSetInterval.mockClear();
            
            // Now activate debugger while paused
            sendMessage(WORKER_MESSAGES.SET_DEBUGGER_ACTIVE, true);
            expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 100);
        });
    });

    describe('run to address', () => {
        beforeEach(() => {
            // Clear mocks for run to address tests
            vi.clearAllMocks();
        });

        it('should handle RUN_TO_ADDRESS', () => {
            mockApple1.cpu.setExecutionHook.mockClear();
            mockPostMessage.mockClear();
            
            sendMessage(WORKER_MESSAGES.RUN_TO_ADDRESS, 0x2000);
            
            expect(mockApple1.cpu.setExecutionHook).toHaveBeenCalled();
            expect(mockPostMessage).toHaveBeenCalledWith({
                data: 0x2000,
                type: WORKER_MESSAGES.RUN_TO_CURSOR_TARGET
            });
        });

        it('should not run if already at target address', () => {
            mockApple1.cpu.PC = 0x2000;
            mockApple1.clock.resume.mockClear();
            
            sendMessage(WORKER_MESSAGES.RUN_TO_ADDRESS, 0x2000);
            
            expect(mockApple1.clock.resume).not.toHaveBeenCalled();
            // Note: logging is mocked internally by the manual mock
        });

        it('should pause when reaching target address', () => {
            // Set up run-to-address
            sendMessage(WORKER_MESSAGES.RUN_TO_ADDRESS, 0x2000);
            
            // Get the current execution hook
            const executionHook = workerModule.__mocks__.getCurrentExecutionHook();
            expect(executionHook).toBeDefined();
            
            // Simulate reaching the target
            mockPostMessage.mockClear();
            mockApple1.cpu.PC = 0x2000;
            
            const shouldPause = executionHook(0x2000);
            expect(shouldPause).toBe(true);
            expect(mockPostMessage).toHaveBeenCalledWith({
                data: 'cursor',
                type: WORKER_MESSAGES.EMULATION_STATUS
            });
        });
    });

    describe('edge cases', () => {
        beforeEach(() => {
            // Clear mocks for edge case tests
            vi.clearAllMocks();
        });

        it('should handle memory range request with invalid addresses', () => {
            const request = { start: -100, length: 4 };
            sendMessage(WORKER_MESSAGES.GET_MEMORY_RANGE, request);
            
            expect(mockPostMessage).toHaveBeenCalledWith({
                data: {
                    start: -100,
                    data: expect.any(Array)
                },
                type: WORKER_MESSAGES.MEMORY_RANGE_DATA
            });
        });

        it('should handle memory range request beyond 0xFFFF', () => {
            const request = { start: 0xFFFE, length: 4 };
            sendMessage(WORKER_MESSAGES.GET_MEMORY_RANGE, request);
            
            expect(mockPostMessage).toHaveBeenCalledWith({
                data: {
                    start: 0xFFFE,
                    data: expect.any(Array)
                },
                type: WORKER_MESSAGES.MEMORY_RANGE_DATA
            });
        });

        it('should handle stepping after hitting a breakpoint', () => {
            // Set a breakpoint and hit it
            sendMessage(WORKER_MESSAGES.SET_BREAKPOINT, 0x1000);
            mockApple1.cpu.PC = 0x1000;
            
            // Now step
            mockApple1.cpu.performSingleStep.mockClear();
            mockApple1.clock.pause.mockClear();
            
            sendMessage(WORKER_MESSAGES.STEP);
            
            expect(mockApple1.cpu.performSingleStep).toHaveBeenCalled();
            expect(mockApple1.clock.pause).toHaveBeenCalled();
        });
    });
});