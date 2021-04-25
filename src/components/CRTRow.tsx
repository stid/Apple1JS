import { memo } from 'react';
import * as CRTConstants from './CRTConstants';
import CRTRowChar from './CRTRowChar';
import { styled } from '@stitches/react';

const CRTRowContainer = styled('div', {
    position: 'absolute',
    height: '13px',
});

type CRTRowProps = {
    line: string;
    rowIndex: number;
};
const CRTRow = memo(({ line, rowIndex }: CRTRowProps) => {
    return (
        <CRTRowContainer style={{ top: `${rowIndex * CRTConstants.FONT_RECT + CRTConstants.TOP_PADDING}px` }}>
            {line.split('').map((char, index) => (
                <CRTRowChar char={char} x={index} key={index} />
            ))}
        </CRTRowContainer>
    );
});

CRTRow.displayName = 'CRTRow';

export default CRTRow;
