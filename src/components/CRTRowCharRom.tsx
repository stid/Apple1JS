import { memo, useRef, useEffect } from 'react';
import * as CRTConstants from './CRTConstants';
import CharRomCanvasRenderer from './CharRomCanvasRenderer';
import apple1vid from '../apple1/roms/apple1vid';

const pixelSize = 2;
const defaultColor = '#68D391';

const canvasRenderer = new CharRomCanvasRenderer(apple1vid, pixelSize, defaultColor);

type CRTRowCharProps = {
    char: string;
    x: number;
};

const CRTRowChar = memo(({ char, x }: CRTRowCharProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
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
        <div
            className="absolute"
            style={{ left: `${x * (CRTConstants.FONT_RECT[0] - 4) + CRTConstants.LEFT_PADDING}px` }}
        >
            <canvas ref={canvasRef} width={8 * pixelSize} height={8 * pixelSize} />
        </div>
    );
});

CRTRowChar.displayName = 'CRTRowChar';

export default CRTRowChar;
