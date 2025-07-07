import type { CHARROM } from './types';

class CharRomCanvasRenderer {
    private rom: CHARROM;
    private pixelSize: number;
    private color: string;
    private canvasPool: { [key: number]: HTMLCanvasElement };

    constructor(rom: CHARROM, pixelSize: number, color: string) {
        this.rom = rom;
        this.pixelSize = pixelSize;
        this.color = color;
        this.canvasPool = {};
        this.preRenderCanvases();
    }

    private createCharacterCanvas(charCode: number): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
        canvas.width = 8 * this.pixelSize;
        canvas.height = 8 * this.pixelSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get canvas context');
        }

        const characterBitmap = this.rom[charCode] || [];

        ctx.save();
        ctx.scale(-1, 1);
        ctx.translate(-8 * this.pixelSize, 0);
        characterBitmap.forEach((byte, y) => {
            for (let x = 0; x < 8; x++) {
                const isPixelOn = (byte >> (7 - x)) & 1;
                ctx.fillStyle = isPixelOn ? this.color : 'transparent';
                ctx.fillRect(x * this.pixelSize, y * this.pixelSize, this.pixelSize, this.pixelSize);
            }
        });
        ctx.restore();

        return canvas;
    }

    private preRenderCanvases(): void {
        for (let charCode = 0; charCode < 256; charCode++) {
            this.canvasPool[charCode] = this.createCharacterCanvas(charCode);
        }
    }

    public getCanvas(charCode: number): HTMLCanvasElement {
        const canvas = this.canvasPool[charCode];
        if (!canvas) {
            throw new Error(`Canvas for character code ${charCode} not found`);
        }
        return canvas;
    }
}

export default CharRomCanvasRenderer;
