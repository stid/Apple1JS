import React, { useState, useEffect } from 'react';
import { useLogging } from '../contexts/LoggingContext';
import { LogLevel } from '../types/logging';

const StatusPanel: React.FC = () => {
    const { messages, clearMessages, removeMessage } = useLogging();
    const [isExpanded, setIsExpanded] = useState(true);
    const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all');

    // Auto-collapse info messages after 3 seconds, warnings after 10 seconds
    useEffect(() => {
        messages.forEach(message => {
            if (message.level === 'info') {
                setTimeout(() => removeMessage(message.id), 3000);
            } else if (message.level === 'warn') {
                setTimeout(() => removeMessage(message.id), 10000);
            }
            // Errors persist until manually cleared
        });
    }, [messages, removeMessage]);

    const filteredMessages = messages.filter(message => 
        levelFilter === 'all' || message.level === levelFilter
    );

    const getMessageStyle = (level: LogLevel): string => {
        switch (level) {
            case 'info':
                return 'border-green-700 bg-green-900/20 text-green-400';
            case 'warn':
                return 'border-yellow-700 bg-yellow-900/20 text-yellow-400';
            case 'error':
                return 'border-red-700 bg-red-900/20 text-red-400';
            default:
                return 'border-gray-700 bg-gray-900/20 text-gray-400';
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
                    className="text-gray-400 hover:text-gray-200 flex items-center gap-1"
                >
                    <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
                    <span>System Status ({filteredMessages.length})</span>
                </button>
                <div className="flex items-center gap-2">
                    <select
                        value={levelFilter}
                        onChange={(e) => setLevelFilter(e.target.value as LogLevel | 'all')}
                        className="bg-black/50 border border-gray-700 text-gray-400 rounded px-1 py-0 text-xs"
                    >
                        <option value="all">All</option>
                        <option value="info">Info</option>
                        <option value="warn">Warn</option>
                        <option value="error">Error</option>
                    </select>
                    <button
                        onClick={clearMessages}
                        className="text-gray-500 hover:text-red-400 text-xs px-1"
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
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-1 flex-1 min-w-0">
                                    <span className="text-xs opacity-75">
                                        {getLevelIcon(message.level)}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-xs opacity-75">[{message.source}]</span>
                                        <span className="ml-1">{message.message}</span>
                                        {message.count > 1 && (
                                            <span className="ml-1 px-1 rounded bg-black/30 text-xs">
                                                ×{message.count}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 text-xs opacity-50">
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
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default StatusPanel;