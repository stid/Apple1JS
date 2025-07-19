import { describe, expect, beforeEach, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { AppContent } from '../AppContent';
import { createMockWorkerManager } from '../../test-support/mocks/WorkerManager.mock';
import type { WorkerManager } from '../../services/WorkerManager';

// Mock child components
vi.mock('../Info', () => ({
    __esModule: true,
    default: () => <div data-testid="info-component">Info Component</div>
}));

vi.mock('../InspectorView', () => ({
    __esModule: true,
    default: () => <div data-testid="inspector-component">Inspector Component</div>
}));

vi.mock('../DebuggerLayout', () => ({
    __esModule: true,
    default: () => <div data-testid="debugger-component">Debugger Component</div>
}));

vi.mock('../CRTWorker', () => ({
    __esModule: true,
    default: () => <div data-testid="crt-worker">CRT Worker</div>
}));

vi.mock('../Actions', () => ({
    __esModule: true,
    default: () => <div data-testid="actions">Actions</div>
}));

vi.mock('../AlertBadges', () => ({
    __esModule: true,
    default: () => <div data-testid="alert-badges">Alert Badges</div>
}));

vi.mock('../AlertPanel', () => ({
    __esModule: true,
    default: () => <div data-testid="alert-panel">Alert Panel</div>
}));

// Mock contexts
vi.mock('../../contexts/LoggingContext', () => ({
    useLogging: () => ({
        addMessage: vi.fn()
    })
}));

vi.mock('../../contexts/DebuggerNavigationContext', () => ({
    useDebuggerNavigation: () => ({
        subscribeToNavigation: vi.fn(() => () => {})
    })
}));

describe('AppContent', () => {
    let mockWorkerManager: WorkerManager;

    beforeEach(() => {
        mockWorkerManager = createMockWorkerManager();

        // Mock timers for setTimeout tests
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
    });

    describe('Paste Functionality', () => {
        it('should handle paste events on the hidden input', async () => {
            render(<AppContent workerManager={mockWorkerManager} />);

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
            vi.mocked(mockWorkerManager.keyDown).mockClear();

            // Fast-forward timers to trigger all setTimeout calls
            act(() => {
                vi.runAllTimers();
            });


            // Verify each character was sent with proper timing
            expect(mockWorkerManager.keyDown).toHaveBeenCalledTimes(2);
            expect(mockWorkerManager.keyDown).toHaveBeenCalledWith('A');
            expect(mockWorkerManager.keyDown).toHaveBeenCalledWith('B');
        });

        it('should handle newline characters in pasted text', async () => {
            render(<AppContent workerManager={mockWorkerManager} />);

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
            vi.mocked(mockWorkerManager.keyDown).mockClear();

            act(() => {
                vi.runAllTimers();
            });

            // Should send: A, Enter, B
            expect(mockWorkerManager.keyDown).toHaveBeenCalledTimes(3);
            
            // Check that newline becomes Enter
            expect(mockWorkerManager.keyDown).toHaveBeenCalledWith('Enter');
        });

        it('should handle carriage return characters in pasted text', async () => {
            render(<AppContent workerManager={mockWorkerManager} />);

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
            vi.mocked(mockWorkerManager.keyDown).mockClear();

            act(() => {
                vi.runAllTimers();
            });

            // Should send: A, Enter, B
            expect(mockWorkerManager.keyDown).toHaveBeenCalledTimes(3);
            expect(mockWorkerManager.keyDown).toHaveBeenCalledWith('Enter');
        });

        it('should handle empty paste events gracefully', async () => {
            render(<AppContent workerManager={mockWorkerManager} />);

            const hiddenInput = document.querySelector('input[aria-label="Hidden input for keyboard focus"]');

            act(() => {
                fireEvent.paste(hiddenInput!, {
                    clipboardData: {
                        getData: () => ''
                    }
                });
            });

            // Clear any existing calls first
            vi.mocked(mockWorkerManager.keyDown).mockClear();

            act(() => {
                vi.runAllTimers();
            });

            // Should not send any messages for empty paste
            expect(mockWorkerManager.keyDown).not.toHaveBeenCalled();
        });

        it('should handle paste events with no clipboardData', async () => {
            render(<AppContent workerManager={mockWorkerManager} />);

            const hiddenInput = document.querySelector('input[aria-label="Hidden input for keyboard focus"]');
            
            act(() => {
                fireEvent.paste(hiddenInput!, {
                    clipboardData: {
                        getData: () => null
                    }
                });
            });

            // Clear any existing calls first
            vi.mocked(mockWorkerManager.keyDown).mockClear();

            act(() => {
                vi.runAllTimers();
            });

            // Should not send any messages when no clipboardData
            expect(mockWorkerManager.keyDown).not.toHaveBeenCalled();
        });

        it('should use correct timing delays between characters', async () => {
            render(<AppContent workerManager={mockWorkerManager} />);

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
            vi.mocked(mockWorkerManager.keyDown).mockClear();

            // Check that no messages are sent immediately
            expect(mockWorkerManager.keyDown).not.toHaveBeenCalled();

            // Test timing - the first character should fire at 0ms delay (index 0 * 160)
            // Second character at 160ms (index 1 * 160), third at 320ms (index 2 * 160)
            
            // Advance timer by 1ms - no characters should be sent yet since first is at 0ms already
            act(() => {
                vi.advanceTimersByTime(1);
            });
            expect(mockWorkerManager.keyDown).toHaveBeenCalledTimes(1);
            expect(mockWorkerManager.keyDown).toHaveBeenLastCalledWith('A');

            // Advance timer to 160ms (second character)
            act(() => {
                vi.advanceTimersByTime(159);
            });
            expect(mockWorkerManager.keyDown).toHaveBeenCalledTimes(2);
            expect(mockWorkerManager.keyDown).toHaveBeenLastCalledWith('B');

            // Advance timer to 320ms (third character)
            act(() => {
                vi.advanceTimersByTime(160);
            });
            expect(mockWorkerManager.keyDown).toHaveBeenCalledTimes(3);
            expect(mockWorkerManager.keyDown).toHaveBeenLastCalledWith('C');
        });
    });

    describe('Keyboard Functionality', () => {
        it('should handle keydown events and ignore modifier keys', async () => {
            render(<AppContent workerManager={mockWorkerManager} />);

            const hiddenInput = document.querySelector('input[aria-label="Hidden input for keyboard focus"]');

            // Test normal key
            act(() => {
                fireEvent.keyDown(hiddenInput!, { key: 'A' });
            });
            expect(mockWorkerManager.keyDown).toHaveBeenCalledWith('A');

            vi.mocked(mockWorkerManager.keyDown).mockClear();

            // Test modifier keys (should be ignored)
            act(() => {
                fireEvent.keyDown(hiddenInput!, { key: 'A', metaKey: true });
            });
            expect(mockWorkerManager.keyDown).not.toHaveBeenCalled();

            act(() => {
                fireEvent.keyDown(hiddenInput!, { key: 'A', ctrlKey: true });
            });
            expect(mockWorkerManager.keyDown).not.toHaveBeenCalled();

            act(() => {
                fireEvent.keyDown(hiddenInput!, { key: 'A', altKey: true });
            });
            expect(mockWorkerManager.keyDown).not.toHaveBeenCalled();
        });
    });

    describe('Mobile Input Functionality', () => {
        it('should have a hidden input field with proper mobile attributes', () => {
            render(<AppContent workerManager={mockWorkerManager} />);

            const hiddenInput = document.querySelector('input[aria-label="Hidden input for keyboard focus"]') as HTMLInputElement;
            expect(hiddenInput).toBeInTheDocument();
            
            // Test mobile-friendly attributes
            expect(hiddenInput).toHaveAttribute('autoComplete', 'off');
            expect(hiddenInput).toHaveAttribute('autoCorrect', 'off');
            expect(hiddenInput).toHaveAttribute('autoCapitalize', 'off');
            expect(hiddenInput).toHaveAttribute('spellCheck', 'false');
            expect(hiddenInput).toHaveAttribute('tabIndex', '0');
            expect(hiddenInput).toHaveAttribute('type', 'text');
            
            // Should NOT have readOnly attribute (breaks mobile keyboards)
            expect(hiddenInput).not.toHaveAttribute('readOnly');
            
            // Should be controllable
            expect(hiddenInput).toHaveValue('');
        });

        it('should have proper positioning styles for mobile compatibility', () => {
            render(<AppContent workerManager={mockWorkerManager} />);

            const hiddenInput = document.querySelector('input[aria-label="Hidden input for keyboard focus"]') as HTMLInputElement;
            const styles = window.getComputedStyle(hiddenInput);
            
            // Should be positioned off-screen but still focusable
            expect(styles.position).toBe('absolute');
            expect(styles.left).toBe('-9999px');
            expect(styles.opacity).toBe('0');
            expect(styles.width).toBe('1px');
            expect(styles.height).toBe('1px');
            
            // Should NOT have pointerEvents: none (breaks mobile touch)
            expect(styles.pointerEvents).not.toBe('none');
        });

        it('should focus hidden input when CRT area is clicked', () => {
            render(<AppContent workerManager={mockWorkerManager} />);

            const hiddenInput = document.querySelector('input[aria-label="Hidden input for keyboard focus"]') as HTMLInputElement;
            const crtArea = document.querySelector('[data-testid="crt-worker"]')?.parentElement;
            
            expect(crtArea).toBeInTheDocument();
            
            // Mock focus method
            const focusSpy = vi.spyOn(hiddenInput, 'focus');
            
            act(() => {
                fireEvent.click(crtArea!);
            });
            
            expect(focusSpy).toHaveBeenCalled();
            focusSpy.mockRestore();
        });

        it('should handle keyboard input from mobile devices', () => {
            render(<AppContent workerManager={mockWorkerManager} />);

            const hiddenInput = document.querySelector('input[aria-label="Hidden input for keyboard focus"]');
            
            // Simulate mobile keyboard input
            act(() => {
                fireEvent.keyDown(hiddenInput!, { key: 'a' });
            });
            
            expect(mockWorkerManager.keyDown).toHaveBeenCalledWith('a');
        });

        it('should ignore modifier keys on mobile', () => {
            render(<AppContent workerManager={mockWorkerManager} />);

            const hiddenInput = document.querySelector('input[aria-label="Hidden input for keyboard focus"]');
            
            // Clear any existing calls first
            vi.mocked(mockWorkerManager.keyDown).mockClear();
            
            // Test various modifier key combinations
            act(() => {
                fireEvent.keyDown(hiddenInput!, { key: 'a', metaKey: true });
            });
            
            act(() => {
                fireEvent.keyDown(hiddenInput!, { key: 'a', ctrlKey: true });
            });
            
            act(() => {
                fireEvent.keyDown(hiddenInput!, { key: 'a', altKey: true });
            });
            
            // Should not send any messages for modifier key combinations
            expect(mockWorkerManager.keyDown).not.toHaveBeenCalled();
        });

        it('should maintain focus when switching tabs', () => {
            const { getByText } = render(<AppContent workerManager={mockWorkerManager} />);

            const hiddenInput = document.querySelector('input[aria-label="Hidden input for keyboard focus"]') as HTMLInputElement;
            const inspectorTab = getByText('Inspector');
            
            // Mock focus method
            const focusSpy = vi.spyOn(hiddenInput, 'focus');
            
            act(() => {
                fireEvent.click(inspectorTab);
            });
            
            expect(focusSpy).toHaveBeenCalled();
            focusSpy.mockRestore();
        });

        it('should handle onChange events properly (controlled input)', () => {
            render(<AppContent workerManager={mockWorkerManager} />);

            const hiddenInput = document.querySelector('input[aria-label="Hidden input for keyboard focus"]') as HTMLInputElement;
            
            // Should handle change events without errors
            act(() => {
                fireEvent.change(hiddenInput, { target: { value: 'test' } });
            });
            
            // Value should remain empty (controlled input)
            expect(hiddenInput.value).toBe('');
        });
    });
});