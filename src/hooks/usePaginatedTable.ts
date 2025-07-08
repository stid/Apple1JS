import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Formatters } from '../utils/formatters';

interface UsePaginatedTableOptions {
    initialAddress?: number;
    bytesPerRow?: number;
    rowHeight?: number;
    onDataRequest?: (address: number, size: number) => void;
}

interface UsePaginatedTableResult {
    currentAddress: number;
    visibleRows: number;
    size: number;
    
    // Navigation
    navigateUp: () => void;
    navigateDown: () => void;
    navigateTo: (address: number) => void;
    
    // Refs for measurement
    containerRef: React.RefObject<HTMLDivElement | null>;
    contentRef: React.RefObject<HTMLDivElement | null>;
    
    // Display helpers
    getAddressRange: () => string;
}

export function usePaginatedTable(options: UsePaginatedTableOptions = {}): UsePaginatedTableResult {
    const {
        initialAddress = 0x0000,
        bytesPerRow = 16,
        rowHeight = 25,
        onDataRequest
    } = options;
    
    const [currentAddress, setCurrentAddress] = useState(initialAddress);
    const [visibleRows, setVisibleRows] = useState(15);
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    
    const size = visibleRows * bytesPerRow;
    
    // Calculate visible rows based on container height
    useEffect(() => {
        const calculateRows = () => {
            if (!contentRef.current) return;
            
            const content = contentRef.current;
            
            window.requestAnimationFrame(() => {
                const table = content.querySelector('table');
                if (!table) return;
                
                const thead = table.querySelector('thead') as HTMLElement;
                if (!thead) return;
                
                // Measure actual row height if possible
                const tbody = table.querySelector('tbody');
                let actualRowHeight = rowHeight;
                
                if (tbody) {
                    const firstRow = tbody.querySelector('tr');
                    if (firstRow) {
                        const rowRect = firstRow.getBoundingClientRect();
                        actualRowHeight = rowRect.height || rowHeight;
                    }
                }
                
                // Get actual measurements
                const contentRect = content.getBoundingClientRect();
                const theadRect = thead.getBoundingClientRect();
                
                // Available height for tbody
                const availableHeight = contentRect.height - theadRect.height;
                
                // Calculate rows
                const possibleRows = Math.floor(availableHeight / actualRowHeight);
                
                // Set visible rows with minimum of 3
                setVisibleRows(Math.max(3, possibleRows));
            });
        };
        
        // Initial calculation
        const timer = setTimeout(calculateRows, 150);
        
        // Recalculate on resize
        const resizeObserver = new ResizeObserver(calculateRows);
        
        if (contentRef.current) {
            resizeObserver.observe(contentRef.current);
        }
        
        window.addEventListener('resize', calculateRows);
        
        return () => {
            clearTimeout(timer);
            resizeObserver.disconnect();
            window.removeEventListener('resize', calculateRows);
        };
    }, [rowHeight]);
    
    // Request data when address or size changes
    useEffect(() => {
        if (onDataRequest) {
            onDataRequest(currentAddress, size);
        }
    }, [currentAddress, size, onDataRequest]);
    
    // Navigation functions
    const navigateUp = useCallback(() => {
        const newAddr = Math.max(0, currentAddress - size);
        setCurrentAddress(newAddr);
    }, [currentAddress, size]);
    
    const navigateDown = useCallback(() => {
        // Calculate the maximum valid starting address
        const maxStartAddr = Math.max(0, 0xFFFF - size + 1);
        
        // Calculate next address
        const nextAddr = currentAddress + size;
        
        // Ensure we don't go past the maximum valid start address
        if (nextAddr > maxStartAddr) {
            // Snap to the last valid page that shows up to 0xFFFF
            setCurrentAddress(maxStartAddr);
        } else {
            setCurrentAddress(nextAddr);
        }
    }, [currentAddress, size]);
    
    const navigateTo = useCallback((address: number) => {
        if (address >= 0 && address <= 0xFFFF) {
            // Ensure the address won't cause the view to exceed memory bounds
            const maxStartAddr = Math.max(0, 0xFFFF - size + 1);
            const validAddr = Math.min(address, maxStartAddr);
            setCurrentAddress(validAddr);
        }
    }, [size]);
    
    const getAddressRange = useCallback(() => {
        const start = Formatters.hex(currentAddress, 4);
        const end = Formatters.hex(Math.min(0xFFFF, currentAddress + size - 1), 4);
        return `$${start} - $${end}`;
    }, [currentAddress, size]);
    
    return {
        currentAddress,
        visibleRows,
        size,
        navigateUp,
        navigateDown,
        navigateTo,
        containerRef,
        contentRef,
        getAddressRange
    };
}