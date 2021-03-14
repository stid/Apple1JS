import styled from 'styled-components';
import { memo, useEffect, useState } from 'react';
import * as CRTConstants from './CRTConstants';

const CursorContainer = styled.div`
    width: 12px;
    height: 12px;
    position: absolute;
`;
type CursorProp = {
    row: number;
    column: number;
};
const CRTCursor = memo(({ row, column }: CursorProp) => {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        setTimeout(
            () => {
                setVisible(!visible);
            },
            visible ? 600 : 400,
        );
    }, [visible]);

    return (
        <>
            <CursorContainer
                style={{
                    left: `${column * CRTConstants.FONT_RECT + CRTConstants.LEFT_PADDING}px`,
                    top: `${row * CRTConstants.FONT_RECT + CRTConstants.TOP_PADDING}px`,
                    display: `${visible ? 'none' : 'block'}`,
                }}
            >
                @
            </CursorContainer>
        </>
    );
});

export default CRTCursor;
