/**
 * @jest-environment jsdom
 */

require('@testing-library/jest-dom/extend-expect');
import CRTRow from '../CRTRow';
import { render, screen } from '@testing-library/react';

describe('CRTRow', function () {
    test('Render CRTRow component', function () {
        const { container } = render(<CRTRow line={'AZ'} rowIndex={2} />);
        expect(container).toMatchInlineSnapshot(`
            <div>
              <div
                class="c-eFUkS"
                style="top: 40px;"
              >
                <div
                  class="c-cOstaE"
                  style="left: 10px;"
                >
                  A
                </div>
                <div
                  class="c-cOstaE"
                  style="left: 25px;"
                >
                  Z
                </div>
              </div>
            </div>
        `);
    });

    test('Render Row String', function () {
        render(<CRTRow line={'AB'} rowIndex={2} />);
        expect(screen.getByText('A')).toBeInTheDocument();
        expect(screen.getByText('B')).toBeInTheDocument();
    });

    test('Render with proper Top position', function () {
        const { container } = render(<CRTRow line={'AZ'} rowIndex={2} />);
        expect(container?.getElementsByTagName('div')[0].style.top).toBe('40px');
    });

    test('Render Line elemets to proper left position', function () {
        render(<CRTRow line={'AB'} rowIndex={2} />);

        let tmpElement = screen.getByText('A');
        expect(tmpElement).toBeInTheDocument();
        expect(tmpElement.style.left).toBe('10px');

        tmpElement = screen.getByText('B');
        expect(tmpElement).toBeInTheDocument();
        expect(tmpElement.style.left).toBe('25px');
    });
});
