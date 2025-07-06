import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { LogMessage, LoggingContextType, LogLevel } from '../types/logging';
import { loggingService } from '../services/LoggingService';

const MAX_MESSAGES = 1000;
const BATCH_UPDATE_DELAY = 100; // ms

const LoggingContext = createContext<LoggingContextType | undefined>(undefined);

export const useLogging = (): LoggingContextType => {
    const context = useContext(LoggingContext);
    if (!context) {
        throw new Error('useLogging must be used within a LoggingProvider');
    }
    return context;
};

export const LoggingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [messages, setMessages] = useState<LogMessage[]>([]);
    const pendingMessages = useRef<Map<string, Omit<LogMessage, 'id' | 'timestamp'>>>(new Map());
    const batchUpdateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Process pending messages in batch
    const processPendingMessages = useCallback(() => {
        if (pendingMessages.current.size === 0) return;

        setMessages(prevMessages => {
            let updatedMessages = [...prevMessages];
            const now = new Date();

            // Process all pending messages
            pendingMessages.current.forEach((pendingMsg) => {
                const existingIndex = updatedMessages.findIndex(
                    msg => msg.source === pendingMsg.source && msg.message === pendingMsg.message
                );

                if (existingIndex >= 0) {
                    // Update existing message
                    updatedMessages[existingIndex] = {
                        ...updatedMessages[existingIndex],
                        timestamp: now,
                        count: updatedMessages[existingIndex].count + pendingMsg.count,
                    };
                } else {
                    // Add new message
                    const id = `${now.getTime()}-${Math.random().toString(36).substring(2, 11)}`;
                    updatedMessages.push({
                        ...pendingMsg,
                        id,
                        timestamp: now,
                    } as LogMessage);
                }
            });

            // Clear pending messages
            pendingMessages.current.clear();

            // Enforce message limit (keep most recent)
            if (updatedMessages.length > MAX_MESSAGES) {
                updatedMessages = updatedMessages.slice(-MAX_MESSAGES);
            }

            return updatedMessages;
        });
    }, []);

    const addMessage = useCallback((newMessage: Omit<LogMessage, 'id' | 'timestamp' | 'count'>) => {
        const key = `${newMessage.source}-${newMessage.message}`;
        
        // Add or update pending message
        const existing = pendingMessages.current.get(key);
        if (existing) {
            existing.count = (existing.count || 1) + 1;
        } else {
            pendingMessages.current.set(key, {
                ...newMessage,
                count: 1,
            });
        }

        // Clear existing timer
        if (batchUpdateTimer.current) {
            clearTimeout(batchUpdateTimer.current);
        }

        // Set new timer for batch update
        batchUpdateTimer.current = setTimeout(() => {
            processPendingMessages();
            batchUpdateTimer.current = null;
        }, BATCH_UPDATE_DELAY);
    }, [processPendingMessages]);

    const clearMessages = useCallback(() => {
        // Clear any pending updates
        if (batchUpdateTimer.current) {
            clearTimeout(batchUpdateTimer.current);
            batchUpdateTimer.current = null;
        }
        pendingMessages.current.clear();
        setMessages([]);
    }, []);

    const removeMessage = useCallback((id: string) => {
        setMessages(prevMessages => prevMessages.filter(msg => msg.id !== id));
    }, []);

    // Connect to the logging service
    useEffect(() => {
        const handler = (level: LogLevel, source: string, message: string) => {
            addMessage({ level, source, message });
        };

        loggingService.addHandler(handler);

        return () => {
            loggingService.removeHandler(handler);
            // Clean up any pending timer
            if (batchUpdateTimer.current) {
                clearTimeout(batchUpdateTimer.current);
                processPendingMessages();
            }
        };
    }, [addMessage, processPendingMessages]);

    const value: LoggingContextType = {
        messages,
        addMessage,
        clearMessages,
        removeMessage,
    };

    return (
        <LoggingContext.Provider value={value}>
            {children}
        </LoggingContext.Provider>
    );
};