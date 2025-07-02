export type LogLevel = 'info' | 'warn' | 'error';

export interface LogMessage {
    id: string;
    timestamp: Date;
    level: LogLevel;
    source: string;
    message: string;
    count: number;
}

export interface LoggingContextType {
    messages: LogMessage[];
    addMessage: (message: Omit<LogMessage, 'id' | 'timestamp' | 'count'>) => void;
    clearMessages: () => void;
    removeMessage: (id: string) => void;
}