import KeyboardLogic from '../KeyboardLogic';
import PIA6820 from '../../core/PIA6820';

jest.mock('../../core/PIA6820');

describe('KeyboardLogic', function () {
    let pia: PIA6820;
    let keyboardLogic: KeyboardLogic;

    test('Should Wire & write 65 on PIA', async function () {
        pia = new PIA6820();

        keyboardLogic = new KeyboardLogic(pia);

        await keyboardLogic.write(65);
        expect(pia.setDataA).toBeCalledWith(193); // 65 with B7 Up
        expect(pia.setBitCtrA).toBeCalledWith(7); // CA1 raise - PIA will raise CTRL A bit 7
    });
});
