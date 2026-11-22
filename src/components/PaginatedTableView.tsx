import React, { useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { Formatters } from '../utils/formatters';
import { isTypingInField } from '../utils/keyboard-focus';

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
    contentRef: externalContentRef,
}) => {
    const [addressInput, setAddressInput] = useState(Formatters.hex(currentAddress, 4));
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
        // Allow $ prefix and hex digits
        const value = e.target.value.toUpperCase();

        // If it starts with $, keep it and ensure the rest is hex
        if (value.startsWith('$')) {
            const hexPart = value.slice(1).replace(/[^0-9A-F]/g, '');
            if (hexPart.length <= 4) {
                setAddressInput('$' + hexPart);
            }
        } else {
            // No $, just hex digits
            const hexValue = value.replace(/[^0-9A-F]/g, '');
            if (hexValue.length <= 4) {
                setAddressInput(hexValue);
            }
        }
    }, []);

    const handleAddressSubmit = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
                // Handle $ prefix for hex values
                const cleanInput = addressInput.startsWith('$') ? addressInput.slice(1) : addressInput;
                const addr = parseInt(cleanInput || '0', 16);
                if (!isNaN(addr) && addr >= 0 && addr <= 0xffff) {
                    onAddressChange(addr);
                }
            }
        },
        [addressInput, onAddressChange],
    );

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't handle while the user is editing a field
            if (isTypingInField()) return;

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
            className={`h-full flex flex-col bg-surface-secondary rounded-lg border border-border-primary overflow-hidden ${className}`}
        >
            {/* Controls Header */}
            <div className="p-sm border-b border-border-subtle shrink-0">
                <div className="flex flex-wrap items-center gap-sm">
                    {/* Address Navigation */}
                    <div className="flex items-center gap-xs">
                        <label className="eyebrow">Addr</label>
                        <input
                            type="text"
                            value={addressInput}
                            onChange={handleAddressChange}
                            onKeyDown={handleAddressSubmit}
                            className="field w-20 text-data-address"
                            placeholder="0000"
                            maxLength={4}
                        />
                        <div className="flex gap-xs">
                            <button
                                onClick={onNavigateUp}
                                className="btn btn-secondary w-7 px-0"
                                title="Previous page (↑)"
                            >
                                ↑
                            </button>
                            <button
                                onClick={onNavigateDown}
                                className="btn btn-secondary w-7 px-0"
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
                        {addressRange && <span className="text-xs text-text-secondary font-mono">{addressRange}</span>}
                        <span className="text-xs text-text-muted">{rowCount} rows</span>
                    </div>
                </div>

                {/* Keyboard shortcuts help */}
                {keyboardShortcuts && <div className="mt-xs text-xs text-text-muted">{keyboardShortcuts}</div>}
            </div>

            {/* Table Content */}
            <div ref={contentRef} className="flex-1 overflow-hidden">
                <table className="w-full font-mono text-sm">
                    {renderTableHeader()}
                    <tbody>{renderTableRows()}</tbody>
                </table>
            </div>
        </div>
    );
};

export default PaginatedTableView;
