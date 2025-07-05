import React, { useEffect, useState, useRef } from 'react';
import * as CRTConstants from './CRTConstants';
import CRTRowChar from './CRTRowCharRom';

type CRTCursorProps = {
    row: number;
    column: number;
};

const getCursorStyle = (row: number, column: number, visible: boolean) => ({
    left: `${column * (CRTConstants.FONT_RECT[0] - 4) + CRTConstants.LEFT_PADDING - 11}px`,
    top: `${row * CRTConstants.FONT_RECT[1] + CRTConstants.TOP_PADDING}px`,
    opacity: visible ? 1 : 0,
    transition: 'opacity 0.1s linear',
});

const BLINK_INTERVAL = 500; // ms

const CRTCursor: React.FC<CRTCursorProps> = ({ row, column }) => {
    const [visible, setVisible] = useState(true);
    const lastPos = useRef({ row, column });

    useEffect(() => {
        // Reset blink if cursor moves
        if (lastPos.current.row !== row || lastPos.current.column !== column) {
            setVisible(true);
            lastPos.current = { row, column };
        }
    }, [row, column]);

    useEffect(() => {
        const interval = setInterval(() => {
            setVisible((v) => !v);
        }, BLINK_INTERVAL);
        return () => clearInterval(interval);
    }, []);

    return (
        <div 
            className="absolute crt-char-glow" 
            data-testid="cursor" 
            style={getCursorStyle(row, column, visible)}
        >
            <CRTRowChar x={0} char="@" />
        </div>
    );
};

export default React.memo(CRTCursor);
// Set displayName for DevTools
(React.memo(CRTCursor) as React.MemoExoticComponent<typeof CRTCursor>).displayName = 'CRTCursor';
