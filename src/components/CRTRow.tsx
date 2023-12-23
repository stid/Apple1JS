import { memo } from 'react';
import * as CRTConstants from './CRTConstants';
import CRTRowChar from './CRTRowCharRom';

type CRTRowProps = {
    line: string;
    rowIndex: number;
};
const CRTRow = memo(({ line, rowIndex }: CRTRowProps) => {
    const chars = [...line];

    return (
        <div
            className="absolute"
            style={{ top: `${rowIndex * CRTConstants.FONT_RECT[1] + CRTConstants.TOP_PADDING}px` }}
        >
            {chars.map((char, index) => (
                <CRTRowChar char={char} x={index} key={index} />
            ))}
        </div>
    );
});

CRTRow.displayName = 'CRTRow';

export default CRTRow;
