/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-explicit-any */
import '@testing-library/jest-dom';

// Mock ResizeObserver
(global as any).ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
}));

// Mock requestAnimationFrame
(global as any).requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
    setTimeout(callback, 0);
    return 0;
});

// Mock window.addEventListener for resize events
const resizeListeners: Array<() => void> = [];
const originalAddEventListener = window.addEventListener.bind(window);
window.addEventListener = jest.fn((event: any, listener: any) => {
    if (event === 'resize' && typeof listener === 'function') {
        resizeListeners.push(listener);
    } else {
        originalAddEventListener(event, listener);
    }
}) as any;