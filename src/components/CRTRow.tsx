
import React from 'react';
import * as CRTConstants from './CRTConstants';
import CRTRowChar from './CRTRowCharRom';

type CRTRowProps = {
  line: string;
  rowIndex: number;
};

const getRowStyle = (rowIndex: number) => ({
  top: `${rowIndex * CRTConstants.FONT_RECT[1] + CRTConstants.TOP_PADDING}px`,
});

const CRTRow: React.FC<CRTRowProps> = ({ line, rowIndex }) => {
  const chars = [...line];
  return (
    <div className="absolute" style={getRowStyle(rowIndex)}>
      {chars.map((char, index) => (
        <CRTRowChar char={char} x={index} key={index} />
      ))}
    </div>
  );
};

export default React.memo(CRTRow);
// Set displayName for DevTools
(React.memo(CRTRow) as React.MemoExoticComponent<typeof CRTRow>).displayName = 'CRTRow';
