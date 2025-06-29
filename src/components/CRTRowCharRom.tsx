
import React, { useRef, useEffect } from 'react';
import * as CRTConstants from './CRTConstants';
import CharRomCanvasRenderer from './CharRomCanvasRenderer';
import apple1vid from '../apple1/roms/apple1vid';

const pixelSize = 2;
const defaultColor = '#68D391';
const canvasRenderer = new CharRomCanvasRenderer(apple1vid, pixelSize, defaultColor);

type CRTRowCharRomProps = {
  char: string;
  x: number;
};

const getCharRomStyle = (x: number) => ({
  left: `${x * (CRTConstants.FONT_RECT[0] - 4) + CRTConstants.LEFT_PADDING}px`,
});

const CRTRowCharRom: React.FC<CRTRowCharRomProps> = ({ char, x }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!char || typeof char !== 'string' || char.length === 0) {
      // If char is empty or invalid, clear the canvas
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }
      }
      return;
    }
    const asciiCode = char.charCodeAt(0);
    const preRenderedCanvas = canvasRenderer.getCanvas(asciiCode);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.drawImage(preRenderedCanvas, 0, 0);
      }
    }
  }, [char]);

  return (
    <div className="absolute" style={getCharRomStyle(x)}>
      <canvas ref={canvasRef} width={8 * pixelSize} height={8 * pixelSize} className="block" />
    </div>
  );
};

export default React.memo(CRTRowCharRom);
// Set displayName for DevTools
(React.memo(CRTRowCharRom) as React.MemoExoticComponent<typeof CRTRowCharRom>).displayName = 'CRTRowCharRom';
