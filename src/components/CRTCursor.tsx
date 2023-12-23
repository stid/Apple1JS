import { memo, useEffect, useState } from 'react';
import * as CRTConstants from './CRTConstants';
import CRTRowChar from './CRTRowCharRom'; // Import the CRTRowChar component

type CursorProp = {
    row: number;
    column: number;
};

const CRTCursor = memo(({ row, column }: CursorProp) => {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const toggleVisibility = () => setVisible((prevVisible) => !prevVisible);
        const visibleTimeout = visible ? 400 : 600;
        const timerId = setTimeout(toggleVisibility, visibleTimeout);

        return () => clearTimeout(timerId);
    }, [visible]);

    const cursorStyle = {
        left: `${column * (CRTConstants.FONT_RECT[0] - 4) + CRTConstants.LEFT_PADDING - 11}px`,
        top: `${row * CRTConstants.FONT_RECT[1] + CRTConstants.TOP_PADDING}px`,
        display: visible ? 'block' : 'none',
    };

    return (
        <div className="absolute" data-testid="cursor" style={cursorStyle}>
            <CRTRowChar x={0} char="@" />
        </div>
    );
});

CRTCursor.displayName = 'CRTCursor';

export default CRTCursor;
