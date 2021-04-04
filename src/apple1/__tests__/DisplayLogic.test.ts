import DisplayLogic from '../DisplayLogic';
import PIA6820 from '../../core/PIA6820';
jest.mock('../../core/PIA6820');

describe('KeyboardLogic', function () {
    let pia: PIA6820;
    let displayLogic: DisplayLogic;
    let video: any;

    test('Should Wire & write 65 on PIA', async function () {
        pia = new PIA6820();

        displayLogic = new DisplayLogic(pia, {
            read: async (address: number) => {
                return 1;
            },
            write: async (value: number) => {
                return 1;
            },
            wire: (options: any) => {
                return 1;
            },
        });

        await displayLogic.write(65);
        expect(pia.setBitDataB).toBeCalledWith(7);
        expect(pia.clearBitDataB).toBeCalledWith(7);
    });

    test('Should Wire & write 65 on PIA 2', async function (done) {
        pia = new PIA6820();
        const fnRead = jest.fn();

        displayLogic = new DisplayLogic(pia, {
            read: async (address: number) => {
                return;
            },
            write: async (value: number) => {
                expect(value).toBe(65);
                done();
            },
            wire: (options: any) => {
                return;
            },
        });

        displayLogic.write(65);
    });
});
