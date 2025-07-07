import '@testing-library/jest-dom/jest-globals';
import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { LoggingProvider, useLogging } from '../LoggingContext';
import { loggingService } from '../../services/LoggingService';
import type { LogHandler } from '../../services/types';

// Test component that uses the useLogging hook
const TestComponent: React.FC = () => {
    const { messages, addMessage, clearMessages, removeMessage } = useLogging();
    
    return (
        <div>
            <div data-testid="message-count">{messages.length}</div>
            <div data-testid="messages">
                {messages.map(msg => (
                    <div key={msg.id} data-testid={`message-${msg.id}`}>
                        {msg.level}:{msg.source}:{msg.message}:{msg.count}
                    </div>
                ))}
            </div>
            <button onClick={() => addMessage({ level: 'info', source: 'test', message: 'test message' })}>
                Add Message
            </button>
            <button onClick={clearMessages}>Clear Messages</button>
            <button onClick={() => messages[0] && removeMessage(messages[0].id)}>
                Remove First
            </button>
        </div>
    );
};

describe('LoggingContext', () => {
    let handlers: LogHandler[] = [];
    
    beforeEach(() => {
        handlers = [];
        jest.spyOn(loggingService, 'addHandler').mockImplementation((handler) => {
            handlers.push(handler);
        });
        jest.spyOn(loggingService, 'removeHandler').mockImplementation((handler) => {
            handlers = handlers.filter(h => h !== handler);
        });
        jest.useFakeTimers();
    });
    
    afterEach(() => {
        jest.clearAllMocks();
        jest.useRealTimers();
    });
    
    describe('useLogging hook', () => {
        it('should throw error when used outside LoggingProvider', () => {
            // Suppress console.error for this test
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            
            const TestError = () => {
                try {
                    useLogging();
                    return null;
                } catch (error) {
                    return <div>{(error as Error).message}</div>;
                }
            };
            
            const { container } = render(<TestError />);
            expect(container.textContent).toBe('useLogging must be used within a LoggingProvider');
            
            consoleSpy.mockRestore();
        });
    });
    
    describe('LoggingProvider', () => {
        it('should provide logging context to children', () => {
            render(
                <LoggingProvider>
                    <TestComponent />
                </LoggingProvider>
            );
            
            expect(screen.getByTestId('message-count')).toHaveTextContent('0');
            expect(screen.getByTestId('messages')).toBeEmptyDOMElement();
        });
        
        it('should register handler with loggingService on mount', () => {
            render(
                <LoggingProvider>
                    <TestComponent />
                </LoggingProvider>
            );
            
            expect(loggingService.addHandler).toHaveBeenCalledTimes(1);
            expect(handlers).toHaveLength(1);
        });
        
        it('should unregister handler on unmount', () => {
            const { unmount } = render(
                <LoggingProvider>
                    <TestComponent />
                </LoggingProvider>
            );
            
            const handler = handlers[0];
            unmount();
            
            expect(loggingService.removeHandler).toHaveBeenCalledWith(handler);
        });
        
        it('should handle messages from logging service', async () => {
            render(
                <LoggingProvider>
                    <TestComponent />
                </LoggingProvider>
            );
            
            const handler = handlers[0];
            
            act(() => {
                handler('info', 'TestSource', 'Test message from service');
            });
            
            // Wait for batch update
            act(() => {
                jest.advanceTimersByTime(10);
            });
            
            await waitFor(() => {
                expect(screen.getByTestId('message-count')).toHaveTextContent('1');
            });
            
            const messages = screen.getAllByTestId(/^message-[^c]/);
            expect(messages).toHaveLength(1);
            expect(messages[0]).toHaveTextContent('info:TestSource:Test message from service:1');
        });
    });
    
    describe('addMessage', () => {
        it('should add new messages', async () => {
            render(
                <LoggingProvider>
                    <TestComponent />
                </LoggingProvider>
            );
            
            const addButton = screen.getByText('Add Message');
            
            act(() => {
                addButton.click();
            });
            
            // Wait for batch update
            act(() => {
                jest.advanceTimersByTime(10);
            });
            
            await waitFor(() => {
                expect(screen.getByTestId('message-count')).toHaveTextContent('1');
            });
        });
        
        it('should batch messages and increment count for duplicates', async () => {
            render(
                <LoggingProvider>
                    <TestComponent />
                </LoggingProvider>
            );
            
            const addButton = screen.getByText('Add Message');
            
            // Add same message multiple times quickly
            act(() => {
                addButton.click();
                addButton.click();
                addButton.click();
            });
            
            // Wait for batch update
            act(() => {
                jest.advanceTimersByTime(10);
            });
            
            await waitFor(() => {
                expect(screen.getByTestId('message-count')).toHaveTextContent('1');
            });
            
            const messages = screen.getAllByTestId(/^message-[^c]/);
            expect(messages).toHaveLength(1);
            expect(messages[0]).toHaveTextContent('info:test:test message:3');
        });
        
        it('should handle multiple different messages', async () => {
            render(
                <LoggingProvider>
                    <TestComponent />
                </LoggingProvider>
            );
            
            const handler = handlers[0];
            
            act(() => {
                handler('info', 'Source1', 'Message 1');
                handler('warn', 'Source2', 'Message 2');
                handler('error', 'Source3', 'Message 3');
            });
            
            // Wait for batch update
            act(() => {
                jest.advanceTimersByTime(10);
            });
            
            await waitFor(() => {
                expect(screen.getByTestId('message-count')).toHaveTextContent('3');
            });
        });
        
        it('should enforce maximum message limit', async () => {
            render(
                <LoggingProvider>
                    <TestComponent />
                </LoggingProvider>
            );
            
            const handler = handlers[0];
            
            // Add more than MAX_MESSAGES (1000)
            act(() => {
                for (let i = 0; i < 1005; i++) {
                    handler('info', 'Source', `Message ${i}`);
                    // Process batch every 100 messages to avoid huge pending map
                    if (i % 100 === 0) {
                        jest.advanceTimersByTime(10);
                    }
                }
            });
            
            // Final batch update
            act(() => {
                jest.advanceTimersByTime(10);
            });
            
            await waitFor(() => {
                const count = screen.getByTestId('message-count').textContent;
                expect(parseInt(count || '0')).toBeLessThanOrEqual(1000);
            });
        });
    });
    
    describe('clearMessages', () => {
        it('should clear all messages', async () => {
            render(
                <LoggingProvider>
                    <TestComponent />
                </LoggingProvider>
            );
            
            const handler = handlers[0];
            const clearButton = screen.getByText('Clear Messages');
            
            // Add some messages
            act(() => {
                handler('info', 'Source1', 'Message 1');
                handler('info', 'Source2', 'Message 2');
            });
            
            // Wait for batch update
            act(() => {
                jest.advanceTimersByTime(10);
            });
            
            await waitFor(() => {
                expect(screen.getByTestId('message-count')).toHaveTextContent('2');
            });
            
            // Clear messages
            act(() => {
                clearButton.click();
            });
            
            expect(screen.getByTestId('message-count')).toHaveTextContent('0');
            expect(screen.getByTestId('messages')).toBeEmptyDOMElement();
        });
        
        it('should clear pending messages when clearing', async () => {
            render(
                <LoggingProvider>
                    <TestComponent />
                </LoggingProvider>
            );
            
            const handler = handlers[0];
            const clearButton = screen.getByText('Clear Messages');
            
            // Add messages but don't wait for batch
            act(() => {
                handler('info', 'Source1', 'Message 1');
                handler('info', 'Source2', 'Message 2');
            });
            
            // Clear before batch processes
            act(() => {
                clearButton.click();
            });
            
            // Now let batch timer run
            act(() => {
                jest.advanceTimersByTime(10);
            });
            
            // Should still be empty
            expect(screen.getByTestId('message-count')).toHaveTextContent('0');
        });
    });
    
    describe('removeMessage', () => {
        it('should remove specific message by id', async () => {
            render(
                <LoggingProvider>
                    <TestComponent />
                </LoggingProvider>
            );
            
            const handler = handlers[0];
            const removeButton = screen.getByText('Remove First');
            
            // Add messages
            act(() => {
                handler('info', 'Source1', 'Message 1');
                handler('info', 'Source2', 'Message 2');
            });
            
            // Wait for batch update
            act(() => {
                jest.advanceTimersByTime(10);
            });
            
            await waitFor(() => {
                expect(screen.getByTestId('message-count')).toHaveTextContent('2');
            });
            
            // Remove first message
            act(() => {
                removeButton.click();
            });
            
            expect(screen.getByTestId('message-count')).toHaveTextContent('1');
            
            // Verify the right message remains
            const remaining = screen.getAllByTestId(/^message-[^c]/);
            expect(remaining).toHaveLength(1);
            expect(remaining[0]).toHaveTextContent('info:Source2:Message 2:1');
        });
        
        it('should handle removing non-existent message', () => {
            render(
                <LoggingProvider>
                    <TestComponent />
                </LoggingProvider>
            );
            
            const removeButton = screen.getByText('Remove First');
            
            // Try to remove when no messages exist
            expect(() => {
                act(() => {
                    removeButton.click();
                });
            }).not.toThrow();
        });
    });
    
    describe('batch processing', () => {
        it('should batch updates within delay window', async () => {
            render(
                <LoggingProvider>
                    <TestComponent />
                </LoggingProvider>
            );
            
            const handler = handlers[0];
            
            // Add messages in quick succession
            act(() => {
                handler('info', 'Source', 'Message');
                jest.advanceTimersByTime(5); // Half the batch delay
                handler('info', 'Source', 'Message'); // Same message
                jest.advanceTimersByTime(3);
                handler('info', 'Source', 'Message'); // Same message again
            });
            
            // Messages should not be visible yet
            expect(screen.getByTestId('message-count')).toHaveTextContent('0');
            
            // Complete the batch delay
            act(() => {
                jest.advanceTimersByTime(2);
            });
            
            await waitFor(() => {
                expect(screen.getByTestId('message-count')).toHaveTextContent('1');
            });
            
            // Should have count of 3
            const messages = screen.getAllByTestId(/^message-[^c]/);
            expect(messages).toHaveLength(1);
            expect(messages[0]).toHaveTextContent('info:Source:Message:3');
        });
        
        it('should process pending messages on unmount', async () => {
            const { unmount } = render(
                <LoggingProvider>
                    <TestComponent />
                </LoggingProvider>
            );
            
            const handler = handlers[0];
            
            // Add message but don't wait for batch
            act(() => {
                handler('info', 'Source', 'Pending message');
            });
            
            // Unmount should trigger processing
            unmount();
            
            // Verify timer was cleared
            expect(jest.getTimerCount()).toBe(0);
        });
    });
    
    describe('message deduplication', () => {
        it('should update timestamp when duplicate message arrives', async () => {
            render(
                <LoggingProvider>
                    <TestComponent />
                </LoggingProvider>
            );
            
            const handler = handlers[0];
            
            // Add first message
            act(() => {
                handler('info', 'Source', 'Duplicate message');
            });
            
            // Process first batch
            act(() => {
                jest.advanceTimersByTime(10);
            });
            
            await waitFor(() => {
                expect(screen.getByTestId('message-count')).toHaveTextContent('1');
            });
            
            // Add same message later
            act(() => {
                jest.advanceTimersByTime(1000); // Advance time significantly
                handler('info', 'Source', 'Duplicate message');
            });
            
            // Process second batch
            act(() => {
                jest.advanceTimersByTime(10);
            });
            
            // Should still have only one message but with updated count
            expect(screen.getByTestId('message-count')).toHaveTextContent('1');
            const messages = screen.getAllByTestId(/^message-[^c]/);
            expect(messages).toHaveLength(1);
            expect(messages[0]).toHaveTextContent('info:Source:Duplicate message:2');
        });
    });
});