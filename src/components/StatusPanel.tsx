import React, { useState, useEffect } from 'react';
import { useLogging } from '../contexts/LoggingContext';
import { LogLevel } from '../types/logging';

const StatusPanel: React.FC = () => {
    const { messages, clearMessages, removeMessage } = useLogging();
    const [isExpanded, setIsExpanded] = useState(true);
    const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all');

    // Auto-collapse warnings after 10 seconds, but keep info logs and errors persistent
    useEffect(() => {
        const timers: ReturnType<typeof setTimeout>[] = [];
        
        messages.forEach(message => {
            if (message.level === 'warn') {
                const timer = setTimeout(() => removeMessage(message.id), 10000);
                timers.push(timer);
            }
            // Info logs and errors persist until manually cleared
        });
        
        // Cleanup timers when component unmounts or messages change
        return () => {
            timers.forEach(timer => clearTimeout(timer));
        };
    }, [messages, removeMessage]);

    const filteredMessages = messages.filter(message => 
        levelFilter === 'all' || message.level === levelFilter
    );

    const getMessageStyle = (level: LogLevel): string => {
        switch (level) {
            case 'info':
                return 'border-success bg-success/10 text-success';
            case 'warn':
                return 'border-warning bg-warning/10 text-warning';
            case 'error':
                return 'border-error bg-error/10 text-error';
            default:
                return 'border-border-primary bg-surface-secondary text-text-secondary';
        }
    };

    const getLevelIcon = (level: LogLevel): string => {
        switch (level) {
            case 'info':
                return 'ℹ';
            case 'warn':
                return '⚠';
            case 'error':
                return '✕';
            default:
                return '•';
        }
    };

    if (filteredMessages.length === 0) {
        return null;
    }

    return (
        <div className="mb-2 font-mono text-xs">
            <div className="flex items-center justify-between mb-1">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-text-secondary hover:text-text-primary flex items-center gap-1"
                >
                    <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
                    <span>System Status ({filteredMessages.length})</span>
                </button>
                <div className="flex items-center gap-2">
                    <select
                        value={levelFilter}
                        onChange={(e) => setLevelFilter(e.target.value as LogLevel | 'all')}
                        className="bg-black/50 border border-border-primary text-text-secondary rounded px-1 py-0 text-xs"
                    >
                        <option value="all">All</option>
                        <option value="info">Info</option>
                        <option value="warn">Warn</option>
                        <option value="error">Error</option>
                    </select>
                    <button
                        onClick={clearMessages}
                        className="text-text-muted hover:text-error text-xs px-1"
                        title="Clear all messages"
                    >
                        ✕
                    </button>
                </div>
            </div>
            
            {isExpanded && (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                    {filteredMessages.map(message => (
                        <div
                            key={message.id}
                            className={`px-2 py-1 rounded border text-xs ${getMessageStyle(message.level)} animate-fade-in`}
                        >
                            <div className="flex flex-col gap-1">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-start gap-1 flex-1 min-w-0">
                                        <span className="text-xs opacity-75 flex-shrink-0">
                                            {getLevelIcon(message.level)}
                                        </span>
                                        <div className="flex items-baseline gap-1 flex-1 min-w-0">
                                            <span className="text-xs opacity-75 flex-shrink-0">[{message.source}]</span>
                                            {message.count > 1 && (
                                                <span className="px-1 rounded bg-black/30 text-xs flex-shrink-0">
                                                    ×{message.count}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs opacity-50 flex-shrink-0">
                                        <span>{message.timestamp.toLocaleTimeString()}</span>
                                        <button
                                            onClick={() => removeMessage(message.id)}
                                            className="hover:opacity-100 hover:text-red-400"
                                            title="Dismiss"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                                <div className="pl-4 break-all whitespace-pre-wrap overflow-x-auto">
                                    <span className="font-mono text-xs">{message.message}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default StatusPanel;