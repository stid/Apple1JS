import WebCRTVideo, { VideoOut } from '../WebCRTVideo';

const onChange = jest.fn();

const NUM_COLUMNS = 40;
const NUM_ROWS = 24;

describe('WebCRTVideo', function () {
    let webCRTVideo: WebCRTVideo;
    let videoOut: VideoOut;

    beforeEach(function () {
        webCRTVideo = new WebCRTVideo();
        webCRTVideo.subscribe({
            onChange: onChange,
        });
    });
    test('Should Init with pos at 0', function () {
        expect(webCRTVideo.row).toBe(0);
        expect(webCRTVideo.column).toBe(0);
    });

    test('Call on change on Write', async function () {
        const compBuffer = Array(NUM_ROWS);
        for (let i = 0; i < compBuffer.length; i++) {
            compBuffer[i] = [i, Array(NUM_COLUMNS).fill(' ')];
        }
        compBuffer[0][1][0] = '3';

        await webCRTVideo.write(0x33);
        expect(webCRTVideo.row).toBe(0);
        expect(webCRTVideo.column).toBe(1);
        expect(onChange).toBeCalledWith(compBuffer, 0, 1);
    });

    test('Should clear the screen', async function () {
        const compBuffer = Array(NUM_ROWS);
        for (let i = 0; i < compBuffer.length; i++) {
            compBuffer[i] = [i, Array(NUM_COLUMNS).fill(' ')];
        }

        await webCRTVideo.write(0x33);
        webCRTVideo.onClear();
        expect(webCRTVideo.row).toBe(0);
        expect(webCRTVideo.column).toBe(1);
        expect(onChange).toBeCalledWith(compBuffer, 0, 0);
    });

    test('Fill a line + 2 colunm & Scroll Up Buffer', async function () {
        const compBuffer = Array(NUM_ROWS);
        for (let i = 0; i < compBuffer.length; i++) {
            compBuffer[i] = i < 1 ? [i, Array(NUM_COLUMNS).fill('3')] : [i, Array(NUM_COLUMNS).fill(' ')];
        }
        compBuffer[1][1][0] = '3';
        compBuffer[1][1][1] = '3';

        for (let i = 0; i < NUM_COLUMNS + 2; i++) {
            await webCRTVideo.write(0x33);
        }
        expect(webCRTVideo.row).toBe(1);
        expect(webCRTVideo.column).toBe(2);
        expect(onChange).toBeCalledWith(compBuffer, 1, 2);
    });

    afterEach(function () {
        webCRTVideo.unsubscribe(videoOut);
        onChange.mockClear();
    });
});
