import React from 'react';
import { useLogging } from '../contexts/LoggingContext';

interface AlertBadgesProps {
    onInfoClick: () => void;
    onWarnClick: () => void;
    onErrorClick: () => void;
}

const AlertBadges: React.FC<AlertBadgesProps> = ({ onInfoClick, onWarnClick, onErrorClick }) => {
    const { messages } = useLogging();

    // Count messages by level
    const counts = messages.reduce(
        (acc, msg) => {
            acc[msg.level] = (acc[msg.level] || 0) + 1;
            return acc;
        },
        { info: 0, warn: 0, error: 0 } as Record<string, number>
    );

    const Badge = ({ 
        count, 
        level, 
        onClick 
    }: { 
        count: number; 
        level: 'info' | 'warn' | 'error'; 
        onClick: () => void;
    }) => {

        const icons = {
            info: 'ℹ️',
            warn: '⚠️',
            error: '❌'
        };

        const bgColors = {
            info: 'bg-semantic-info/10',
            warn: 'bg-semantic-warning/10',
            error: 'bg-semantic-error/10'
        };

        const borderColors = {
            info: 'border-semantic-info/30',
            warn: 'border-semantic-warning/30',
            error: 'border-semantic-error/30'
        };

        const textColors = {
            info: 'text-semantic-info',
            warn: 'text-semantic-warning',
            error: 'text-semantic-error'
        };

        if (count === 0) {
            return (
                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${bgColors[level]} border ${borderColors[level]} opacity-40`}>
                    <span className="text-[10px]">{icons[level]}</span>
                    <span className={`text-[10px] font-mono ${textColors[level]}`}>0</span>
                </div>
            );
        }

        return (
            <button
                onClick={onClick}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${bgColors[level]} border ${borderColors[level]} hover:opacity-80 transition-opacity`}
                title={`View ${count} ${level} message${count > 1 ? 's' : ''}`}
            >
                <span className="text-[10px]">{icons[level]}</span>
                <span className={`text-[10px] font-mono font-semibold ${textColors[level]}`}>{count}</span>
            </button>
        );
    };

    return (
        <div className="flex items-center gap-1">
            <Badge count={counts.info} level="info" onClick={onInfoClick} />
            <Badge count={counts.warn} level="warn" onClick={onWarnClick} />
            <Badge count={counts.error} level="error" onClick={onErrorClick} />
        </div>
    );
};

export default AlertBadges;