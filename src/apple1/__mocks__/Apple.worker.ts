/* eslint-disable no-undef, @typescript-eslint/no-explicit-any, no-case-declarations */
import { vi } from 'vitest';
import { WORKER_MESSAGES } from '../types/worker-messages';

// Mock instances that match the real worker's exports
export const video = {
    subscribe: vi.fn(),
    setSupportBS: vi.fn(),
    forceUpdate: vi.fn()
};

export const keyboard = {
    write: vi.fn()
};

// Mock Apple1 instance
// Store execution hook for tests to access
let currentExecutionHook: any = null;

const mockApple1 = {
    cpu: {
        PC: 0x0000,
        setExecutionHook: vi.fn().mockImplementation((hook: any) => {
            currentExecutionHook = hook;
        }),
        performSingleStep: vi.fn(),
        toDebug: vi.fn().mockReturnValue({
            PC: 0x0000, A: 0, X: 0, Y: 0, S: 0,
            REG_PC: '$0000', REG_A: '$00', REG_X: '$00', REG_Y: '$00', REG_S: '$00',
            FLAG_N: 'CLR', FLAG_Z: 'CLR', FLAG_C: 'CLR', FLAG_V: 'CLR', FLAG_I: 'CLR', FLAG_D: 'CLR'
        }),
        setProfilingEnabled: vi.fn(),
        setCycleAccurateMode: vi.fn()
    },
    clock: {
        pause: vi.fn(),
        resume: vi.fn(),
        resetTiming: vi.fn(),
        toDebug: vi.fn().mockReturnValue({ paused: false })
    },
    pia: {
        toDebug: vi.fn().mockReturnValue({ portA: 0, portB: 0 })
    },
    bus: {
        toDebug: vi.fn().mockReturnValue({ lastRead: 0, lastWrite: 0 }),
        read: vi.fn().mockImplementation((addr) => addr & 0xFF),
        write: vi.fn()
    },
    saveState: vi.fn().mockReturnValue({ cpu: {}, memory: {} }),
    loadState: vi.fn(),
    startLoop: vi.fn()
};

// Mock global functions
const mockPostMessage = vi.fn();
const mockSetInterval = vi.fn().mockImplementation(() => 123); // Return a consistent interval ID
const mockClearInterval = vi.fn();

// Store original functions if they exist
const originalPostMessage = global.postMessage;
const originalSetInterval = global.setInterval;
const originalClearInterval = global.clearInterval;

// Track worker state
let breakpoints = new Set<number>();
let runToCursorTarget: number | null = null;
let isPaused = false;
let debugUpdateInterval: number | null = null;

// Mock the message handler
function handleMessage(message: any) {
    const { type, data } = message;

    switch (type) {
        case WORKER_MESSAGES.SET_CRT_BS_SUPPORT_FLAG:
            video.setSupportBS(!!data);
            break;
        case WORKER_MESSAGES.KEY_DOWN:
            if (typeof data === 'string') {
                keyboard.write(data);
            }
            break;
        case WORKER_MESSAGES.DEBUG_INFO:
            mockPostMessage({
                data: {
                    cpu: mockApple1.cpu.toDebug(),
                    pia: mockApple1.pia.toDebug(),
                    Bus: mockApple1.bus.toDebug(),
                    clock: mockApple1.clock.toDebug(),
                },
                type: WORKER_MESSAGES.DEBUG_INFO,
            });
            break;
        case WORKER_MESSAGES.SAVE_STATE:
            const state = mockApple1.saveState();
            mockPostMessage({ data: state, type: WORKER_MESSAGES.STATE_DATA });
            break;
        case WORKER_MESSAGES.LOAD_STATE:
            if (data && typeof data === 'object') {
                mockApple1.loadState(data);
                mockApple1.clock.resetTiming();
                mockApple1.startLoop();
                if (typeof video.forceUpdate === 'function') {
                    video.forceUpdate();
                }
            }
            break;
        case WORKER_MESSAGES.PAUSE_EMULATION:
            mockApple1.clock.pause();
            isPaused = true;
            mockPostMessage({ data: 'paused', type: WORKER_MESSAGES.EMULATION_STATUS });
            break;
        case WORKER_MESSAGES.RESUME_EMULATION:
            mockApple1.clock.resume();
            isPaused = false;
            mockPostMessage({ data: 'running', type: WORKER_MESSAGES.EMULATION_STATUS });
            break;
        case WORKER_MESSAGES.GET_MEMORY_RANGE:
            if (data && typeof data === 'object') {
                const request = data;
                const memoryData: number[] = [];
                for (let i = 0; i < request.length; i++) {
                    const addr = request.start + i;
                    memoryData.push(mockApple1.bus.read(addr));
                }
                const response = {
                    start: request.start,
                    data: memoryData,
                };
                mockPostMessage({ data: response, type: WORKER_MESSAGES.MEMORY_RANGE_DATA });
            }
            break;
        case WORKER_MESSAGES.SET_CPU_PROFILING:
            if (typeof data === 'boolean') {
                mockApple1.cpu.setProfilingEnabled(data);
            }
            break;
        case WORKER_MESSAGES.SET_CYCLE_ACCURATE_TIMING:
            if (typeof data === 'boolean') {
                mockApple1.cpu.setCycleAccurateMode(data);
            }
            break;
        case WORKER_MESSAGES.STEP:
            mockApple1.clock.pause();
            isPaused = true;
            mockApple1.cpu.performSingleStep();
            
            if (breakpoints.has(mockApple1.cpu.PC)) {
                mockPostMessage({
                    data: mockApple1.cpu.PC,
                    type: WORKER_MESSAGES.BREAKPOINT_HIT
                });
            }
            
            mockPostMessage({ data: 'stepped', type: WORKER_MESSAGES.EMULATION_STATUS });
            break;
        case WORKER_MESSAGES.SET_BREAKPOINT:
            if (typeof data === 'number') {
                breakpoints.add(data);
                // Create a hook that returns true for breakpoint hits
                mockApple1.cpu.setExecutionHook((pc: number) => {
                    if (breakpoints.has(pc)) {
                        mockPostMessage({ data: 'breakpoint', type: WORKER_MESSAGES.EMULATION_STATUS });
                        return true;
                    }
                    return true;
                });
                mockPostMessage({
                    data: Array.from(breakpoints),
                    type: WORKER_MESSAGES.BREAKPOINTS_DATA
                });
            }
            break;
        case WORKER_MESSAGES.CLEAR_BREAKPOINT:
            if (typeof data === 'number') {
                breakpoints.delete(data);
                mockPostMessage({
                    data: Array.from(breakpoints),
                    type: WORKER_MESSAGES.BREAKPOINTS_DATA
                });
            }
            break;
        case WORKER_MESSAGES.CLEAR_ALL_BREAKPOINTS:
            breakpoints.clear();
            mockPostMessage({
                data: [],
                type: WORKER_MESSAGES.BREAKPOINTS_DATA
            });
            break;
        case WORKER_MESSAGES.GET_BREAKPOINTS:
            mockPostMessage({
                data: Array.from(breakpoints),
                type: WORKER_MESSAGES.BREAKPOINTS_DATA
            });
            break;
        case WORKER_MESSAGES.SET_DEBUGGER_ACTIVE:
            if (typeof data === 'boolean') {
                if (data && !debugUpdateInterval) {
                    const debugCallback = () => {
                        mockPostMessage({
                            data: {
                                cpu: mockApple1.cpu.toDebug(),
                                clock: mockApple1.clock.toDebug(),
                                pia: mockApple1.pia.toDebug(),
                                Bus: mockApple1.bus.toDebug()
                            },
                            type: WORKER_MESSAGES.DEBUG_INFO,
                        });
                    };
                    debugUpdateInterval = mockSetInterval(debugCallback, isPaused ? 100 : 250) as unknown as number;
                } else if (!data && debugUpdateInterval) {
                    mockClearInterval(debugUpdateInterval);
                    debugUpdateInterval = null;
                }
            }
            break;
        case WORKER_MESSAGES.GET_EMULATION_STATUS:
            mockPostMessage({
                data: isPaused ? 'paused' : 'running',
                type: WORKER_MESSAGES.EMULATION_STATUS
            });
            break;
        case WORKER_MESSAGES.RUN_TO_ADDRESS:
            if (typeof data === 'number') {
                const targetAddress = data;
                
                if (mockApple1.cpu.PC === targetAddress) {
                    // Already at target - don't resume
                    break;
                }
                
                runToCursorTarget = targetAddress;
                mockPostMessage({
                    data: runToCursorTarget,
                    type: WORKER_MESSAGES.RUN_TO_CURSOR_TARGET
                });
                
                // Create a hook that checks for target address
                mockApple1.cpu.setExecutionHook((pc: number) => {
                    if (pc === targetAddress) {
                        mockPostMessage({ data: 'cursor', type: WORKER_MESSAGES.EMULATION_STATUS });
                        return true;
                    }
                    return true;
                });
                
                if (isPaused) {
                    mockApple1.clock.resume();
                    isPaused = false;
                    mockPostMessage({ data: 'running', type: WORKER_MESSAGES.EMULATION_STATUS });
                }
            }
            break;
    }
}

// Initialize the mock worker
function initializeMockWorker() {
    // Set up global mocks
    global.postMessage = mockPostMessage;
    global.setInterval = mockSetInterval;
    global.clearInterval = mockClearInterval;
    
    // Set up onmessage handler
    global.onmessage = (e: MessageEvent) => {
        handleMessage(e.data);
    };
    
    // Initialize video subscription - call it during setup
    video.subscribe(vi.fn());
    
    // Initialize breakpoint hook
    mockApple1.cpu.setExecutionHook(vi.fn());
    
    // Start loop
    mockApple1.startLoop();
    isPaused = false;
}

// Reset function for tests
export function resetMockWorker() {
    breakpoints.clear();
    runToCursorTarget = null;
    isPaused = false;
    debugUpdateInterval = null;
    currentExecutionHook = null;
    
    // Reset all mocks
    vi.clearAllMocks();
    
    // Restore global functions
    global.postMessage = originalPostMessage;
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
}

// Export mocks for test access
export const __mocks__ = {
    apple1: mockApple1,
    postMessage: mockPostMessage,
    setInterval: mockSetInterval,
    clearInterval: mockClearInterval,
    handleMessage,
    initializeMockWorker,
    resetMockWorker,
    getCurrentExecutionHook: () => currentExecutionHook
};

// Auto-initialize when imported
initializeMockWorker();