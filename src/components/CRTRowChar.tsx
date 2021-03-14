import { memo } from 'react';
import styled from 'styled-components';
import * as CRTConstants from './CRTConstants';

const CRTRowCharContainer = styled.div`
    width: 13px;
    height: 13px;
    position: absolute;
`;

type CRTRowCharProps = {
    char: string;
    x: number;
};
const CRTRowChar = memo(({ char, x }: CRTRowCharProps) => {
    return (
        <CRTRowCharContainer style={{ left: `${x * CRTConstants.FONT_RECT + CRTConstants.LEFT_PADDING}px` }}>
            {char}
        </CRTRowCharContainer>
    );
});

export default CRTRowChar;
