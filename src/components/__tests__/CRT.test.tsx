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
                class="sxqsz30"
              >
                <div
                  class="sxlkdk6"
                >
                  <div
                    class="sxmv3c1"
                    style="left: 40px; top: 40px; display: block;"
                  >
                    @
                  </div>
                  <div
                    class="sxf1x2q"
                    style="top: 10px;"
                  >
                    <div
                      class="sxfmx7r"
                      style="left: 10px;"
                    >
                      1
                    </div>
                    <div
                      class="sxfmx7r"
                      style="left: 25px;"
                    >
                      2
                    </div>
                    <div
                      class="sxfmx7r"
                      style="left: 40px;"
                    >
                      3
                    </div>
                    <div
                      class="sxfmx7r"
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
