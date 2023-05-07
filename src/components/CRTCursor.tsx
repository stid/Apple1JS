import { memo, useEffect, useState } from 'react';
import * as CRTConstants from './CRTConstants';

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
        left: `${column * CRTConstants.FONT_RECT + CRTConstants.LEFT_PADDING}px`,
        top: `${row * CRTConstants.FONT_RECT + CRTConstants.TOP_PADDING}px`,
        display: visible ? 'block' : 'none',
    };

    return (
        <div className="absolute" style={cursorStyle}>
            @
        </div>
    );
});

CRTCursor.displayName = 'CRTCursor';

export default CRTCursor;
