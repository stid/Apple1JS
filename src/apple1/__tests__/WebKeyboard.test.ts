import WebKeyboard from '../WebKeyboard';

describe('WebKeyboard', function () {
    let webKeyboard: WebKeyboard;

    beforeEach(function () {
        webKeyboard = new WebKeyboard();
    });

    test('Should Wire & write 65', function (done) {
        webKeyboard.wire({
            write: async (value) => {
                expect(value).toBe(65);
                done();
            },
        });
        webKeyboard.write('A');
    });

    test('Should Wire & write Backspace', function (done) {
        webKeyboard.wire({
            write: async (value) => {
                expect(value).toBe(223);
                done();
            },
        });
        webKeyboard.write('Backspace');
    });

    test('Should Wire & write Escape', function (done) {
        webKeyboard.wire({
            write: async (value) => {
                expect(value).toBe(155);
                done();
            },
        });
        webKeyboard.write('Escape');
    });

    test('Should Wire & write Enter', function (done) {
        webKeyboard.wire({
            write: async (value) => {
                expect(value).toBe(141);
                done();
            },
        });
        webKeyboard.write('Enter');
    });

    test('Should Wire & result 65', async function () {
        webKeyboard.wire({
            write: async (value) => {
                return value;
            },
        });
        const result = await webKeyboard.write('A');
        expect(result).toBe(65);
    });
});
