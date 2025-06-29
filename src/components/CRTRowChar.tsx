import React from 'react';
import * as CRTConstants from './CRTConstants';

type CRTRowCharProps = {
    char: string;
    x: number;
};

const getCharStyle = (x: number) => ({
    left: `${x * CRTConstants.FONT_RECT[0] + CRTConstants.LEFT_PADDING}px`,
});

const CRTRowChar: React.FC<CRTRowCharProps> = ({ char, x }) => (
    <div className="absolute" style={getCharStyle(x)}>
        {char}
    </div>
);

export default React.memo(CRTRowChar);
// Set displayName for DevTools
(React.memo(CRTRowChar) as React.MemoExoticComponent<typeof CRTRowChar>).displayName = 'CRTRowChar';
