import React, { useState, useEffect } from 'react';
import { useLogging } from '../contexts/LoggingContext';
import { LogLevel } from '../types/logging';

interface AlertPanelProps {
    isOpen: boolean;
    initialFilter?: LogLevel | 'all';
    onClose: () => void;
}

const AlertPanel: React.FC<AlertPanelProps> = ({ isOpen, initialFilter = 'all', onClose }) => {
    const { messages, removeMessage, clearMessages } = useLogging();
    const [filter, setFilter] = useState<LogLevel | 'all'>(initialFilter);

    useEffect(() => {
        if (initialFilter) {
            setFilter(initialFilter);
        }
    }, [initialFilter]);

    const filteredMessages = filter === 'all' 
        ? messages 
        : messages.filter(m => m.level === filter);

    const getLevelColor = (level: LogLevel) => {
        switch (level) {
            case 'info':
                return 'text-semantic-info';
            case 'warn':
                return 'text-semantic-warning';
            case 'error':
                return 'text-semantic-error';
        }
    };

    const getLevelBgColor = (level: LogLevel) => {
        switch (level) {
            case 'info':
                return 'bg-semantic-info/10';
            case 'warn':
                return 'bg-semantic-warning/10';
            case 'error':
                return 'bg-semantic-error/10';
        }
    };

    const getLevelIcon = (level: LogLevel) => {
        switch (level) {
            case 'info':
                return '•';
            case 'warn':
                return '▲';
            case 'error':
                return '■';
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/50 z-40"
                onClick={onClose}
            />
            
            {/* Panel */}
            <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-surface-primary border-l border-border-subtle shadow-xl z-50 flex flex-col">
                {/* Header */}
                <div className="flex-none border-b border-border-subtle p-3 bg-surface-secondary">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-base font-semibold text-text-primary">System Alerts</h2>
                        <button
                            onClick={onClose}
                            className="p-1 rounded hover:bg-surface-tertiary transition-colors"
                            title="Close"
                        >
                            <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    {/* Filter buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                                filter === 'all' 
                                    ? 'bg-text-accent text-black' 
                                    : 'bg-surface-tertiary text-text-secondary hover:bg-surface-quaternary'
                            }`}
                        >
                            All ({messages.length})
                        </button>
                        <button
                            onClick={() => setFilter('info')}
                            className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                                filter === 'info' 
                                    ? 'bg-semantic-info text-surface-primary' 
                                    : 'bg-semantic-info/20 text-semantic-info hover:bg-semantic-info/30'
                            }`}
                        >
                            Info ({messages.filter(m => m.level === 'info').length})
                        </button>
                        <button
                            onClick={() => setFilter('warn')}
                            className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                                filter === 'warn' 
                                    ? 'bg-semantic-warning text-surface-primary' 
                                    : 'bg-semantic-warning/20 text-semantic-warning hover:bg-semantic-warning/30'
                            }`}
                        >
                            Warn ({messages.filter(m => m.level === 'warn').length})
                        </button>
                        <button
                            onClick={() => setFilter('error')}
                            className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                                filter === 'error' 
                                    ? 'bg-semantic-error text-white' 
                                    : 'bg-semantic-error/20 text-semantic-error hover:bg-semantic-error/30'
                            }`}
                        >
                            Error ({messages.filter(m => m.level === 'error').length})
                        </button>
                    </div>
                </div>

                {/* Messages list */}
                <div className="flex-1 overflow-y-auto p-3">
                    {filteredMessages.length === 0 ? (
                        <div className="text-center text-text-secondary py-8 text-sm">
                            No {filter === 'all' ? '' : filter} messages
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            {filteredMessages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`p-2.5 rounded border ${getLevelBgColor(message.level)} ${
                                        message.level === 'info' ? 'border-semantic-info/30' :
                                        message.level === 'warn' ? 'border-semantic-warning/30' :
                                        'border-semantic-error/30'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                                <span className={`text-xs ${getLevelColor(message.level)} flex items-center gap-1`}>
                                                    <span className="text-[10px]">{getLevelIcon(message.level)}</span>
                                                    <span className="text-[10px] font-bold uppercase">{message.level}</span>
                                                </span>
                                                <span className="text-[10px] text-text-secondary font-mono">
                                                    {message.source}
                                                </span>
                                                <span className="text-[10px] text-text-tertiary">
                                                    {new Date(message.timestamp).toLocaleTimeString([], { 
                                                        hour: '2-digit', 
                                                        minute: '2-digit', 
                                                        second: '2-digit' 
                                                    })}
                                                </span>
                                                {message.count > 1 && (
                                                    <span className="text-[10px] bg-surface-quaternary px-1.5 py-0.5 rounded font-mono">
                                                        ×{message.count}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-text-secondary font-mono break-words">
                                                {message.message}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeMessage(message.id)}
                                            className="flex-none p-0.5 rounded hover:bg-surface-tertiary/50 transition-colors"
                                            title="Dismiss"
                                        >
                                            <svg className="w-3.5 h-3.5 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {filteredMessages.length > 0 && (
                    <div className="flex-none border-t border-border-subtle p-3 bg-surface-secondary">
                        <button
                            onClick={() => {
                                if (filter === 'all') {
                                    clearMessages();
                                } else {
                                    // Clear only filtered messages
                                    filteredMessages.forEach(msg => removeMessage(msg.id));
                                }
                            }}
                            className="w-full px-3 py-1.5 bg-surface-tertiary hover:bg-surface-quaternary text-text-secondary rounded text-xs font-medium transition-colors"
                        >
                            Clear {filter === 'all' ? 'All' : filter} Messages
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};

export default AlertPanel;