import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { LogMessage, LoggingContextType, LogLevel } from '../types/logging';
import { loggingService } from '../services/LoggingService';

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

    const addMessage = useCallback((newMessage: Omit<LogMessage, 'id' | 'timestamp' | 'count'>) => {
        const now = new Date();
        const id = `${now.getTime()}-${Math.random().toString(36).substr(2, 9)}`;
        
        setMessages(prevMessages => {
            // Check for duplicate messages (same source and message)
            const existingIndex = prevMessages.findIndex(
                msg => msg.source === newMessage.source && msg.message === newMessage.message
            );
            
            if (existingIndex >= 0) {
                // Update existing message with new timestamp and increment count
                const updatedMessages = [...prevMessages];
                updatedMessages[existingIndex] = {
                    ...updatedMessages[existingIndex],
                    timestamp: now,
                    count: updatedMessages[existingIndex].count + 1,
                };
                return updatedMessages;
            } else {
                // Add new message
                const message: LogMessage = {
                    ...newMessage,
                    id,
                    timestamp: now,
                    count: 1,
                };
                return [...prevMessages, message];
            }
        });
    }, []);

    const clearMessages = useCallback(() => {
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
        };
    }, [addMessage]);

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