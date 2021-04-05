import DisplayLogic from '../DisplayLogic';
import PIA6820 from '../../core/PIA6820';
jest.mock('../../core/PIA6820');

describe('KeyboardLogic', function () {
    let pia: PIA6820;
    let displayLogic: DisplayLogic;

    test('Should Wire & write 65 on PIA', async function () {
        pia = new PIA6820();

        displayLogic = new DisplayLogic(pia);

        await displayLogic.write(65);
        expect(pia.setBitDataB).toBeCalledWith(7);
        expect(pia.clearBitDataB).toBeCalledWith(7);
    });

    test('Should Wire & write 65 on wired write', async function (done) {
        pia = new PIA6820();

        const wireOptions = {
            write: async (value: number) => {
                expect(value).toBe(65);
                done();
            },
        };

        displayLogic = new DisplayLogic(pia);
        displayLogic.wire(wireOptions);

        displayLogic.write(65);
    });

    test('Should Wire & Reset 65 on wired reset', function () {
        pia = new PIA6820();
        const fnReset = jest.fn();

        const wireOptions = {
            reset: fnReset,
        };

        displayLogic = new DisplayLogic(pia);
        displayLogic.wire(wireOptions);

        displayLogic.reset();
        expect(fnReset).toBeCalled();
    });
});
