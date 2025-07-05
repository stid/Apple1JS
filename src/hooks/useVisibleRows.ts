import React, { useState, useEffect, useRef, useCallback } from 'react';

interface UseVisibleRowsOptions {
    minRows?: number;
    rowHeight?: number;
    headerHeight?: number;
}

interface UseVisibleRowsResult {
    containerRef: React.RefObject<HTMLDivElement | null>;
    visibleRows: number;
    actualHeight: number;
}

/**
 * Hook to calculate how many rows can fit in the visible area
 * @param options Configuration options
 * @returns Container ref and calculated visible rows
 */
export function useVisibleRows(options: UseVisibleRowsOptions = {}): UseVisibleRowsResult {
    const {
        minRows = 3,
        rowHeight = 24, // Approximate height of a table row in pixels
        headerHeight = 0 // Height of fixed headers/controls
    } = options;

    const containerRef = useRef<HTMLDivElement>(null);
    const [visibleRows, setVisibleRows] = useState(minRows);
    const [actualHeight, setActualHeight] = useState(0);

    const calculateVisibleRows = useCallback(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        
        // Calculate available height by subtracting header from total container height
        let availableHeight = rect.height - headerHeight;
        
        // Find the table body or content area for more accurate calculation
        const tbody = container.querySelector('tbody');
        const contentWrapper = container.querySelector('.flex-1.bg-black\\/20, .flex-1.overflow-hidden');
        
        if (tbody && tbody.parentElement) {
            // For tables, calculate based on the space available for tbody
            const table = tbody.parentElement;
            const tableRect = table.getBoundingClientRect();
            const theadHeight = table.querySelector('thead')?.getBoundingClientRect().height || 0;
            availableHeight = tableRect.height - theadHeight;
        } else if (contentWrapper) {
            // For content wrappers, use their actual height
            availableHeight = contentWrapper.getBoundingClientRect().height;
        }
        
        // Calculate how many complete rows can fit
        const possibleRows = Math.floor(availableHeight / rowHeight);
        
        // Ensure minimum rows but don't exceed what actually fits
        const rows = possibleRows > 0 ? Math.max(minRows, possibleRows) : minRows;
        
        setVisibleRows(rows);
        setActualHeight(rows * rowHeight);
    }, [minRows, rowHeight, headerHeight]);

    useEffect(() => {
        // Initial calculation with a small delay to ensure DOM is ready
        const initialTimer = setTimeout(() => {
            calculateVisibleRows();
        }, 50);

        // Recalculate on window resize
        const handleResize = () => {
            calculateVisibleRows();
        };

        window.addEventListener('resize', handleResize);
        
        // Also observe container size changes
        const resizeObserver = new ResizeObserver(() => {
            calculateVisibleRows();
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => {
            clearTimeout(initialTimer);
            window.removeEventListener('resize', handleResize);
            resizeObserver.disconnect();
        };
    }, [calculateVisibleRows]);

    return {
        containerRef,
        visibleRows,
        actualHeight
    };
}