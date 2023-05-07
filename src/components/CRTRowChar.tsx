import { memo } from 'react';
import * as CRTConstants from './CRTConstants';

type CRTRowCharProps = {
    char: string;
    x: number;
};
const CRTRowChar = memo(({ char, x }: CRTRowCharProps) => {
    return (
        <div className="absolute" style={{ left: `${x * CRTConstants.FONT_RECT + CRTConstants.LEFT_PADDING}px` }}>
            {char}
        </div>
    );
});

CRTRowChar.displayName = 'CRTRowChar';

export default CRTRowChar;
