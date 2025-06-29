import React, { useEffect, useState } from 'react';
import * as CRTConstants from './CRTConstants';
import CRTRowChar from './CRTRowCharRom';

type CRTCursorProps = {
    row: number;
    column: number;
};

const getCursorStyle = (row: number, column: number, visible: boolean) => ({
    left: `${column * (CRTConstants.FONT_RECT[0] - 4) + CRTConstants.LEFT_PADDING - 11}px`,
    top: `${row * CRTConstants.FONT_RECT[1] + CRTConstants.TOP_PADDING}px`,
    display: visible ? 'block' : 'none',
});

const CRTCursor: React.FC<CRTCursorProps> = ({ row, column }) => {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const toggleVisibility = () => setVisible((prevVisible) => !prevVisible);
        const visibleTimeout = visible ? 400 : 600;
        const timerId = setTimeout(toggleVisibility, visibleTimeout);
        return () => clearTimeout(timerId);
    }, [visible]);

    return (
        <div className="absolute" data-testid="cursor" style={getCursorStyle(row, column, visible)}>
            <CRTRowChar x={0} char="@" />
        </div>
    );
};

export default React.memo(CRTCursor);
// Set displayName for DevTools
(React.memo(CRTCursor) as React.MemoExoticComponent<typeof CRTCursor>).displayName = 'CRTCursor';
