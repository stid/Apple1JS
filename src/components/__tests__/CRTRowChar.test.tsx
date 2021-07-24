/**
 * @jest-environment jsdom
 */

require('@testing-library/jest-dom/extend-expect');
import CRTRowChar from '../CRTRowChar';
import { render, screen } from '@testing-library/react';

describe('CRTRowChar', function () {
    test('Render CRTRowChar component', function () {
        const { container } = render(<CRTRowChar x={10} char={'Z'} />);

        expect(container).toMatchInlineSnapshot(`
            <div>
              <div
                class="c-cOstaE"
                style="left: 160px;"
              >
                Z
              </div>
            </div>
        `);
    });

    test('Render Char', function () {
        render(<CRTRowChar x={10} char={'B'} />);
        expect(screen.getByText('B')).toBeInTheDocument();
    });

    test('Position X', function () {
        render(<CRTRowChar x={10} char={'Z'} />);
        expect(screen.getByText('Z').style.left).toBe('160px');
    });
});
