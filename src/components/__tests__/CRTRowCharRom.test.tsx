import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import CRTRowCharRom from '../CRTRowCharRom';

describe('CRTRowCharRom', () => {
    it('renders a canvas for the given char and x', () => {
        const { container } = render(<CRTRowCharRom char="A" x={2} />);
        const canvas = container.querySelector('canvas');
        expect(canvas).toBeInTheDocument();
        // Check canvas dimensions
        expect(canvas?.width).toBe(16); // 8 * pixelSize
        expect(canvas?.height).toBe(16); // 8 * pixelSize
    });

    it('positions the canvas according to x', () => {
        const { container } = render(<CRTRowCharRom char="B" x={3} />);
        const div = container.querySelector('div.absolute');
        // Type assertion for HTMLDivElement to access style
        expect((div as HTMLDivElement | null)?.style.left).toMatch(/px$/);
    });

    it('updates the canvas when char changes', () => {
        const { rerender, container } = render(<CRTRowCharRom char="C" x={1} />);
        const canvasBefore = container.querySelector('canvas');
        rerender(<CRTRowCharRom char="D" x={1} />);
        const canvasAfter = container.querySelector('canvas');
        expect(canvasAfter).toBe(canvasBefore); // same canvas element
    });

    it('applies the correct class names for styling', () => {
        const { container } = render(<CRTRowCharRom char="E" x={0} />);
        const canvas = container.querySelector('canvas');
        expect(canvas).toHaveClass('block');
    });

    it('re-draws the canvas when x changes', () => {
        const { rerender, container } = render(<CRTRowCharRom char="F" x={1} />);
        const canvasBefore = container.querySelector('canvas');
        rerender(<CRTRowCharRom char="F" x={2} />);
        const canvasAfter = container.querySelector('canvas');
        expect(canvasAfter).toBe(canvasBefore); // still same canvas element
    });

    it('renders an empty or default canvas for empty char', () => {
        const { container } = render(<CRTRowCharRom char="" x={0} />);
        const canvas = container.querySelector('canvas');
        expect(canvas).toBeInTheDocument();
        // Optionally, check that the canvas is blank or has default pixels
    });

    it('does not crash with unusual props', () => {
        expect(() => {
            render(<CRTRowCharRom char={undefined as unknown as string} x={-1} />);
        }).not.toThrow();
    });
});
