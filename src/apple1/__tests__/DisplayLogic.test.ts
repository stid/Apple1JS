import DisplayLogic from '../DisplayLogic';
import PIA6820 from '../../core/PIA6820';
jest.mock('../../core/PIA6820');

describe('KeyboardLogic', function () {
    let pia: PIA6820;
    let displayLogic: DisplayLogic;

    test('Should Wire & write 65 on PIA', async function () {
        pia = new PIA6820();
        pia.read = jest.fn()
            .mockReturnValueOnce(0x04) // Mock CRB with bit 2 set
            .mockReturnValueOnce(0x04) // Mock ORB read before setting bit 7
            .mockReturnValueOnce(0x84); // Mock ORB read before clearing bit 7 (0x04 | 0x80)
        pia.write = jest.fn();

        displayLogic = new DisplayLogic(pia);

        await displayLogic.write(65);
        
        // Expect sequence: read CRB, read ORB, set PB7, read ORB, clear PB7
        expect(pia.read).toHaveBeenNthCalledWith(1, 3); // Read CRB
        expect(pia.read).toHaveBeenNthCalledWith(2, 2); // Read ORB before setting bit 7
        expect(pia.write).toHaveBeenNthCalledWith(1, 2, 0x84); // Set PB7 (0x04 | 0x80)
        expect(pia.read).toHaveBeenNthCalledWith(3, 2); // Read ORB before clearing bit 7
        expect(pia.write).toHaveBeenNthCalledWith(2, 2, 0x04); // Clear PB7 (0x84 & 0x7F)
    });

    test('Should Wire & write 65 on wired write', async function () {
        pia = new PIA6820();

        const wireOptions = {
            write: async (value: number) => {
                expect(value).toBe(65);
            },
        };

        displayLogic = new DisplayLogic(pia);
        displayLogic.wire(wireOptions);

        await displayLogic.write(65);
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
        expect(fnReset).toHaveBeenCalled();
    });
});
