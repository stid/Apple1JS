import React, { useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { Formatters } from '../utils/formatters';

interface PaginatedTableViewProps {
    // Basic configuration
    currentAddress: number;
    onAddressChange: (address: number) => void;
    
    // Content rendering
    renderTableHeader: () => ReactNode;
    renderTableRows: () => ReactNode;
    
    // Optional sections
    renderExtraControls?: () => ReactNode;
    renderStatusInfo?: () => ReactNode;
    
    // Navigation
    onNavigateUp: () => void;
    onNavigateDown: () => void;
    
    // Display info
    addressRange?: string;
    rowCount: number;
    
    // Keyboard shortcuts help text
    keyboardShortcuts?: string;
    
    // Styling
    className?: string;
    
    // External refs (optional)
    containerRef?: React.RefObject<HTMLDivElement | null>;
    contentRef?: React.RefObject<HTMLDivElement | null>;
}

const PaginatedTableView: React.FC<PaginatedTableViewProps> = ({
    currentAddress,
    onAddressChange,
    renderTableHeader,
    renderTableRows,
    renderExtraControls,
    renderStatusInfo,
    onNavigateUp,
    onNavigateDown,
    addressRange,
    rowCount,
    keyboardShortcuts = '↑↓: Navigate',
    className = '',
    containerRef: externalContainerRef,
    contentRef: externalContentRef
}) => {
    const [addressInput, setAddressInput] = useState(
        Formatters.hex(currentAddress, 4)
    );
    const internalContainerRef = useRef<HTMLDivElement>(null);
    const internalContentRef = useRef<HTMLDivElement>(null);
    
    // Use external refs if provided, otherwise use internal ones
    const containerRef = externalContainerRef || internalContainerRef;
    const contentRef = externalContentRef || internalContentRef;
    
    // Update address input when currentAddress changes
    useEffect(() => {
        setAddressInput(Formatters.hex(currentAddress, 4));
    }, [currentAddress]);
    
    // Handle address input
    const handleAddressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
        if (value.length <= 4) {
            setAddressInput(value);
        }
    }, []);
    
    const handleAddressSubmit = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const addr = parseInt(addressInput || '0', 16);
            if (!isNaN(addr) && addr >= 0 && addr <= 0xFFFF) {
                onAddressChange(addr);
            }
        }
    }, [addressInput, onAddressChange]);
    
    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't handle if input is focused
            if (document.activeElement?.tagName === 'INPUT') return;
            
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                onNavigateUp();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                onNavigateDown();
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onNavigateUp, onNavigateDown]);
    
    return (
        <div 
            ref={containerRef} 
            className={`h-full flex flex-col bg-surface-primary rounded-lg border border-border-primary ${className}`}
        >
            {/* Controls Header */}
            <div className="p-sm border-b border-border-subtle flex-shrink-0">
                <div className="flex flex-wrap items-center gap-sm">
                    {/* Address Navigation */}
                    <div className="flex items-center gap-xs">
                        <label className="text-xs text-text-secondary">Addr:</label>
                        <input
                            type="text"
                            value={addressInput}
                            onChange={handleAddressChange}
                            onKeyDown={handleAddressSubmit}
                            className="bg-black/40 border border-border-primary text-data-address px-2 py-1 w-20 font-mono text-xs rounded transition-colors focus:border-border-accent focus:outline-none"
                            placeholder="0000"
                            maxLength={4}
                        />
                        <div className="flex gap-xs">
                            <button
                                onClick={onNavigateUp}
                                className="px-2 py-1 text-xs bg-surface-secondary border border-border-primary rounded hover:bg-surface-hover"
                                title="Previous page (↑)"
                            >
                                ↑
                            </button>
                            <button
                                onClick={onNavigateDown}
                                className="px-2 py-1 text-xs bg-surface-secondary border border-border-primary rounded hover:bg-surface-hover"
                                title="Next page (↓)"
                            >
                                ↓
                            </button>
                        </div>
                    </div>
                    
                    {/* Optional separator and extra controls */}
                    {renderExtraControls && (
                        <>
                            <div className="h-4 w-px bg-border-subtle" />
                            {renderExtraControls()}
                        </>
                    )}
                    
                    {/* Status info on the right */}
                    <div className="flex items-center gap-xs ml-auto">
                        {renderStatusInfo && renderStatusInfo()}
                        {addressRange && (
                            <span className="text-xs text-text-secondary font-mono">
                                {addressRange}
                            </span>
                        )}
                        <span className="text-xs text-text-muted">
                            {rowCount} rows
                        </span>
                    </div>
                </div>
                
                {/* Keyboard shortcuts help */}
                {keyboardShortcuts && (
                    <div className="mt-xs text-xs text-text-muted">
                        {keyboardShortcuts}
                    </div>
                )}
            </div>
            
            {/* Table Content */}
            <div ref={contentRef} className="flex-1 bg-black/20 overflow-hidden">
                <table className="w-full">
                    {renderTableHeader()}
                    <tbody>
                        {renderTableRows()}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PaginatedTableView;