/**
 * @jest-environment jsdom
 */

require('@testing-library/jest-dom/extend-expect');
import CRT from '../CRT';
import { render } from '@testing-library/react';
import { VideoData } from 'apple1/TSTypes';

const videoData: VideoData = {
    buffer: [[4, ['1', '2', '3', '4']]],
    row: 2,
    column: 2,
};

describe('CRT', function () {
    test('Render CRT component', function () {
        const { container } = render(<CRT videoData={videoData} />);
        expect(container).toMatchInlineSnapshot(`
            <div>
              <div
                class="c-jRhcJL"
              >
                <div
                  class="c-cuLMin"
                >
                  <div
                    class="c-emBIds"
                    style="left: 40px; top: 40px; display: block;"
                  >
                    @
                  </div>
                  <div
                    class="c-eFUkS"
                    style="top: 10px;"
                  >
                    <div
                      class="c-cOstaE"
                      style="left: 10px;"
                    >
                      1
                    </div>
                    <div
                      class="c-cOstaE"
                      style="left: 25px;"
                    >
                      2
                    </div>
                    <div
                      class="c-cOstaE"
                      style="left: 40px;"
                    >
                      3
                    </div>
                    <div
                      class="c-cOstaE"
                      style="left: 55px;"
                    >
                      4
                    </div>
                  </div>
                </div>
              </div>
            </div>
        `);
    });
});
