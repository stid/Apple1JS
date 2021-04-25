import { styled } from '@stitches/react';
import { memo, useEffect, useState } from 'react';
import * as CRTConstants from './CRTConstants';

const CursorContainer = styled('div', {
    width: '12px',
    height: '12px',
    position: 'absolute',
});

type CursorProp = {
    row: number;
    column: number;
};
const CRTCursor = memo(({ row, column }: CursorProp) => {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const t = setTimeout(
            () => {
                setVisible(!visible);
            },
            visible ? 400 : 600,
        );

        return () => clearTimeout(t);
    }, [visible]);

    return (
        <CursorContainer
            style={{
                left: `${column * CRTConstants.FONT_RECT + CRTConstants.LEFT_PADDING}px`,
                top: `${row * CRTConstants.FONT_RECT + CRTConstants.TOP_PADDING}px`,
                display: `${visible ? 'block' : 'none'}`,
            }}
        >
            @
        </CursorContainer>
    );
});

CRTCursor.displayName = 'CRTCursor';

export default CRTCursor;
