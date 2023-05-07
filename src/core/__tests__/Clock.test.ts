import Clock from '../Clock';

describe('Clock', () => {
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
    });

    test('should notify subscribers with timer mocks', async () => {
        jest.useFakeTimers(); // Use fake timers for this test case.

        const clock = new Clock();
        const subscriber = jest.fn();

        clock.subscribe(subscriber);
        expect(subscriber).toHaveBeenCalledTimes(1);

        clock.startLoop();

        // Advance timers by 100 ms.
        jest.advanceTimersByTime(100);

        clock.stopLoop();

        // The subscriber should be called at least once more after starting the loop.
        expect(subscriber).toHaveBeenCalledTimes(2);

        jest.useRealTimers(); // Reset timers to real behavior.
    });
});
