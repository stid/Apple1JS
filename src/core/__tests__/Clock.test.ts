import Clock from '../Clock';
import wait from 'waait';

declare const performance: { now(): number };

jest.mock('waait');

describe('Clock', () => {
    let mockPerformanceNow: jest.SpyInstance;
    
    beforeEach(() => {
        jest.clearAllMocks();
        mockPerformanceNow = jest.spyOn(performance, 'now');
        mockPerformanceNow.mockReturnValue(0);
    });

    afterEach(() => {
        mockPerformanceNow.mockRestore();
    });

    test('should instantiate with default values', () => {
        const clock = new Clock();
        expect(clock.getCurrentProvisionedCycles()).toBe(0);
    });

    test('should instantiate with custom values', () => {
        const customMhz = 2;
        const customStepInterval = 50;
        const clock = new Clock(customMhz, customStepInterval);

        const debugInfo = clock.toDebug();
        expect(debugInfo.mhz).toBe(customMhz);
        expect(debugInfo.stepChunk).toBe(customStepInterval);
        expect(debugInfo.running).toBe(false);
        expect(debugInfo.paused).toBe(false);
    });

    test('should notify subscribers with timer mocks', async () => {
        jest.useFakeTimers();

        const clock = new Clock();
        const subscriber = jest.fn();

        clock.subscribe(subscriber);
        expect(subscriber).toHaveBeenCalledTimes(1);

        clock.startLoop();

        jest.advanceTimersByTime(100);

        clock.stopLoop();

        expect(subscriber).toHaveBeenCalledTimes(2);

        jest.useRealTimers();
    });

    test('should use high-resolution timing with performance.now()', async () => {
        const mockWait = wait as jest.MockedFunction<typeof wait>;
        let waitCallCount = 0;
        mockWait.mockImplementation(() => {
            waitCallCount++;
            if (waitCallCount > 2) {
                clock.stopLoop();
            }
            return Promise.resolve();
        });

        const clock = new Clock(1, 30);
        const subscriber = jest.fn();
        clock.subscribe(subscriber);

        mockPerformanceNow.mockReturnValueOnce(0);
        mockPerformanceNow.mockReturnValueOnce(10);
        mockPerformanceNow.mockReturnValueOnce(20);

        await clock.startLoop();

        expect(mockPerformanceNow).toHaveBeenCalled();
        expect(subscriber).toHaveBeenCalledWith(10000);
    });

    test('should support pause and resume functionality', async () => {
        const mockWait = wait as jest.MockedFunction<typeof wait>;
        let waitCallCount = 0;
        mockWait.mockImplementation(() => {
            waitCallCount++;
            if (waitCallCount === 2) {
                clock.pause();
            } else if (waitCallCount === 4) {
                clock.resume();
            } else if (waitCallCount > 5) {
                clock.stopLoop();
            }
            return Promise.resolve();
        });

        const clock = new Clock();
        const subscriber = jest.fn();
        clock.subscribe(subscriber);

        mockPerformanceNow.mockReturnValueOnce(0);
        mockPerformanceNow.mockReturnValueOnce(10);
        mockPerformanceNow.mockReturnValueOnce(20);
        mockPerformanceNow.mockReturnValueOnce(30);

        await clock.startLoop();

        const debugInfo = clock.toDebug();
        expect(debugInfo.paused).toBe(false);
    });

    test('should include timing statistics in inspectable output', () => {
        const clock = new Clock(2, 40);
        const inspectable = clock.getInspectable();

        expect(inspectable).toMatchObject({
            id: 'clock',
            type: 'Clock',
            mhz: 2,
            stepChunk: 40,
            running: false,
            paused: false
        });

        expect(inspectable.actualFrequency).toMatch(/MHz$/);
        expect(inspectable.drift).toMatch(/%$/);
        expect(inspectable.avgCycleTime).toMatch(/ms$/);
        expect(typeof inspectable.totalCycles).toBe('number');
    });

    test('should calculate drift and apply compensation', async () => {
        const mockWait = wait as jest.MockedFunction<typeof wait>;
        let waitCallCount = 0;
        let time = 0;
        
        mockWait.mockImplementation(() => {
            waitCallCount++;
            time += 10;
            if (waitCallCount > 10) {
                clock.stopLoop();
            }
            return Promise.resolve();
        });

        const clock = new Clock(1, 30);
        mockPerformanceNow.mockImplementation(() => time);

        await clock.startLoop();

        const debugInfo = clock.toDebug();
        expect(debugInfo.actualFrequency).toBeGreaterThanOrEqual(0);
        expect(typeof debugInfo.drift).toBe('number');
    });

    test('should handle maxed cycles correctly', async () => {
        const mockWait = wait as jest.MockedFunction<typeof wait>;
        let waitCallCount = 0;
        
        mockWait.mockImplementation(() => {
            waitCallCount++;
            if (waitCallCount > 1) {
                clock.stopLoop();
            }
            return Promise.resolve();
        });

        const clock = new Clock(1, 30);
        
        mockPerformanceNow.mockReturnValueOnce(0);
        mockPerformanceNow.mockReturnValueOnce(1000);

        await clock.startLoop();

        const debugInfo = clock.toDebug();
        expect(debugInfo.maxedCycles).toBeGreaterThan(0);
    });

    test('should unsubscribe correctly', () => {
        const clock = new Clock();
        const subscriber1 = jest.fn();
        const subscriber2 = jest.fn();

        clock.subscribe(subscriber1);
        clock.subscribe(subscriber2);

        expect(subscriber1).toHaveBeenCalledTimes(1);
        expect(subscriber2).toHaveBeenCalledTimes(1);

        clock.unsubscribe(subscriber1);

        clock['_notifySubscribers']();

        expect(subscriber1).toHaveBeenCalledTimes(1);
        expect(subscriber2).toHaveBeenCalledTimes(2);
    });

    test('should reset state on stopLoop', async () => {
        const mockWait = wait as jest.MockedFunction<typeof wait>;
        let waitCallCount = 0;
        
        mockWait.mockImplementation(() => {
            waitCallCount++;
            if (waitCallCount === 1) {
                clock.pause();
                clock.stopLoop();
            }
            return Promise.resolve();
        });

        const clock = new Clock();
        
        await clock.startLoop();

        const debugInfo = clock.toDebug();
        expect(debugInfo.paused).toBe(false);
        expect(debugInfo.running).toBe(false);
    });
});