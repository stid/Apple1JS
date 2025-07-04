import DisplayLogic from '../DisplayLogic';
import PIA6820 from '../../core/PIA6820';

describe('DisplayLogic', function () {
    let pia: PIA6820;
    let displayLogic: DisplayLogic;

    beforeEach(function () {
        pia = new PIA6820();
        displayLogic = new DisplayLogic(pia);
    });

    test('Should write character to PIA and manage display status', async function () {
        // Set up PIA to access Output Register B (CRB bit 2 = 1)
        pia.write(3, 0x04);
        
        await displayLogic.write(65);
        
        // Check that the display status was managed (PB7 should be back to ready state)
        const portBValue = pia.read(2);
        expect(portBValue & 0x80).toBe(0x00); // PB7 should be 0 (ready state)
    });

    test('Should call wired write callback with correct value', async function () {
        const mockWriteCallback = jest.fn();
        const wireOptions = {
            write: mockWriteCallback,
        };

        displayLogic.wire(wireOptions);
        await displayLogic.write(65);

        expect(mockWriteCallback).toHaveBeenCalledWith(65);
    });

    test('Should call wired reset callback when reset is triggered', function () {
        const mockResetCallback = jest.fn();
        const wireOptions = {
            reset: mockResetCallback,
        };

        displayLogic.wire(wireOptions);
        displayLogic.reset();
        
        expect(mockResetCallback).toHaveBeenCalled();
    });
});
