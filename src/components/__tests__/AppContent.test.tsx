import '@testing-library/jest-dom/jest-globals';
import { render, fireEvent, act } from '@testing-library/react';
import { AppContent } from '../AppContent';
import { WORKER_MESSAGES } from '../../apple1/TSTypes';

// Mock child components
jest.mock('../Info', () => ({
    __esModule: true,
    default: () => <div data-testid="info-component">Info Component</div>
}));

jest.mock('../InspectorView', () => ({
    __esModule: true,
    default: () => <div data-testid="inspector-component">Inspector Component</div>
}));

jest.mock('../DebuggerLayout', () => ({
    __esModule: true,
    default: () => <div data-testid="debugger-component">Debugger Component</div>
}));

jest.mock('../CRTWorker', () => ({
    __esModule: true,
    default: () => <div data-testid="crt-worker">CRT Worker</div>
}));

jest.mock('../Actions', () => ({
    __esModule: true,
    default: () => <div data-testid="actions">Actions</div>
}));

jest.mock('../AlertBadges', () => ({
    __esModule: true,
    default: () => <div data-testid="alert-badges">Alert Badges</div>
}));

jest.mock('../AlertPanel', () => ({
    __esModule: true,
    default: () => <div data-testid="alert-panel">Alert Panel</div>
}));

// Mock contexts
jest.mock('../../contexts/LoggingContext', () => ({
    useLogging: () => ({
        addMessage: jest.fn()
    })
}));

jest.mock('../../contexts/DebuggerNavigationContext', () => ({
    useDebuggerNavigation: () => ({
        subscribeToNavigation: jest.fn(() => () => {})
    })
}));

interface MockWorker {
    postMessage: jest.Mock;
    addEventListener: jest.Mock;
    removeEventListener: jest.Mock;
}

describe('AppContent', () => {
    let mockWorker: MockWorker;

    beforeEach(() => {
        mockWorker = {
            postMessage: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
        };

        // Mock timers for setTimeout tests
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    describe('Paste Functionality', () => {
        it('should handle paste events on the hidden input', async () => {
            render(<AppContent worker={mockWorker as unknown as Worker} />);

            const hiddenInput = document.querySelector('input[aria-label="Hidden input for keyboard focus"]');
            expect(hiddenInput).toBeInTheDocument();

            // Create clipboard event with text data
            const pasteText = 'AB';

            // Fire paste event using fireEvent.paste
            act(() => {
                fireEvent.paste(hiddenInput!, {
                    clipboardData: {
                        getData: () => pasteText
                    }
                });
            });

            // Clear any existing calls first
            mockWorker.postMessage.mockClear();

            // Fast-forward timers to trigger all setTimeout calls
            act(() => {
                jest.runAllTimers();
            });


            // Verify each character was sent with proper timing
            expect(mockWorker.postMessage).toHaveBeenCalledTimes(2);
            expect(mockWorker.postMessage).toHaveBeenCalledWith({
                data: 'A',
                type: WORKER_MESSAGES.KEY_DOWN
            });
            expect(mockWorker.postMessage).toHaveBeenCalledWith({
                data: 'B',
                type: WORKER_MESSAGES.KEY_DOWN
            });
        });

        it('should handle newline characters in pasted text', async () => {
            render(<AppContent worker={mockWorker as unknown as Worker} />);

            const hiddenInput = document.querySelector('input[aria-label="Hidden input for keyboard focus"]');
            const pasteText = 'A\nB';

            act(() => {
                fireEvent.paste(hiddenInput!, {
                    clipboardData: {
                        getData: () => pasteText
                    }
                });
            });

            // Clear any existing calls first
            mockWorker.postMessage.mockClear();

            act(() => {
                jest.runAllTimers();
            });

            // Should send: A, Enter, B
            expect(mockWorker.postMessage).toHaveBeenCalledTimes(3);
            
            // Check that newline becomes Enter
            expect(mockWorker.postMessage).toHaveBeenCalledWith({
                data: 'Enter',
                type: WORKER_MESSAGES.KEY_DOWN
            });
        });

        it('should handle carriage return characters in pasted text', async () => {
            render(<AppContent worker={mockWorker as unknown as Worker} />);

            const hiddenInput = document.querySelector('input[aria-label="Hidden input for keyboard focus"]');
            const pasteText = 'A\rB';

            act(() => {
                fireEvent.paste(hiddenInput!, {
                    clipboardData: {
                        getData: () => pasteText
                    }
                });
            });

            // Clear any existing calls first
            mockWorker.postMessage.mockClear();

            act(() => {
                jest.runAllTimers();
            });

            // Should send: A, Enter, B
            expect(mockWorker.postMessage).toHaveBeenCalledTimes(3);
            expect(mockWorker.postMessage).toHaveBeenCalledWith({
                data: 'Enter',
                type: WORKER_MESSAGES.KEY_DOWN
            });
        });

        it('should handle empty paste events gracefully', async () => {
            render(<AppContent worker={mockWorker as unknown as Worker} />);

            const hiddenInput = document.querySelector('input[aria-label="Hidden input for keyboard focus"]');

            act(() => {
                fireEvent.paste(hiddenInput!, {
                    clipboardData: {
                        getData: () => ''
                    }
                });
            });

            // Clear any existing calls first
            mockWorker.postMessage.mockClear();

            act(() => {
                jest.runAllTimers();
            });

            // Should not send any messages for empty paste
            expect(mockWorker.postMessage).not.toHaveBeenCalled();
        });

        it('should handle paste events with no clipboardData', async () => {
            render(<AppContent worker={mockWorker as unknown as Worker} />);

            const hiddenInput = document.querySelector('input[aria-label="Hidden input for keyboard focus"]');
            
            act(() => {
                fireEvent.paste(hiddenInput!, {
                    clipboardData: {
                        getData: () => null
                    }
                });
            });

            // Clear any existing calls first
            mockWorker.postMessage.mockClear();

            act(() => {
                jest.runAllTimers();
            });

            // Should not send any messages when no clipboardData
            expect(mockWorker.postMessage).not.toHaveBeenCalled();
        });

        it('should use correct timing delays between characters', async () => {
            render(<AppContent worker={mockWorker as unknown as Worker} />);

            const hiddenInput = document.querySelector('input[aria-label="Hidden input for keyboard focus"]');
            const pasteText = 'ABC';

            act(() => {
                fireEvent.paste(hiddenInput!, {
                    clipboardData: {
                        getData: () => pasteText
                    }
                });
            });

            // Clear any existing calls first
            mockWorker.postMessage.mockClear();

            // Check that no messages are sent immediately
            expect(mockWorker.postMessage).not.toHaveBeenCalled();

            // Test timing - the first character should fire at 0ms delay (index 0 * 160)
            // Second character at 160ms (index 1 * 160), third at 320ms (index 2 * 160)
            
            // Advance timer by 1ms - no characters should be sent yet since first is at 0ms already
            act(() => {
                jest.advanceTimersByTime(1);
            });
            expect(mockWorker.postMessage).toHaveBeenCalledTimes(1);
            expect(mockWorker.postMessage).toHaveBeenLastCalledWith({
                data: 'A',
                type: WORKER_MESSAGES.KEY_DOWN
            });

            // Advance timer to 160ms (second character)
            act(() => {
                jest.advanceTimersByTime(159);
            });
            expect(mockWorker.postMessage).toHaveBeenCalledTimes(2);
            expect(mockWorker.postMessage).toHaveBeenLastCalledWith({
                data: 'B',
                type: WORKER_MESSAGES.KEY_DOWN
            });

            // Advance timer to 320ms (third character)
            act(() => {
                jest.advanceTimersByTime(160);
            });
            expect(mockWorker.postMessage).toHaveBeenCalledTimes(3);
            expect(mockWorker.postMessage).toHaveBeenLastCalledWith({
                data: 'C',
                type: WORKER_MESSAGES.KEY_DOWN
            });
        });
    });

    describe('Keyboard Functionality', () => {
        it('should handle keydown events and ignore modifier keys', async () => {
            render(<AppContent worker={mockWorker as unknown as Worker} />);

            const hiddenInput = document.querySelector('input[aria-label="Hidden input for keyboard focus"]');

            // Test normal key
            act(() => {
                fireEvent.keyDown(hiddenInput!, { key: 'A' });
            });
            expect(mockWorker.postMessage).toHaveBeenCalledWith({
                data: 'A',
                type: WORKER_MESSAGES.KEY_DOWN
            });

            mockWorker.postMessage.mockClear();

            // Test modifier keys (should be ignored)
            act(() => {
                fireEvent.keyDown(hiddenInput!, { key: 'A', metaKey: true });
            });
            expect(mockWorker.postMessage).not.toHaveBeenCalled();

            act(() => {
                fireEvent.keyDown(hiddenInput!, { key: 'A', ctrlKey: true });
            });
            expect(mockWorker.postMessage).not.toHaveBeenCalled();

            act(() => {
                fireEvent.keyDown(hiddenInput!, { key: 'A', altKey: true });
            });
            expect(mockWorker.postMessage).not.toHaveBeenCalled();
        });
    });
});