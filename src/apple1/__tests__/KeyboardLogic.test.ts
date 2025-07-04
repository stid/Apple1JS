import PIA6820 from '../../core/PIA6820';
import KeyboardLogic from '../KeyboardLogic';

const mockRead = jest.fn();
const mockWrite = jest.fn();
const mockSetCA1 = jest.fn();

jest.mock('../../core/PIA6820', () => {
    return jest.fn().mockImplementation(() => {
        return {
            read: mockRead,
            write: mockWrite,
            setCA1: mockSetCA1,
        };
    });
});

describe('KeyboardLogic', () => {
    let pia: PIA6820;
    let keyboardLogic: KeyboardLogic;

    beforeEach(() => {
        pia = new PIA6820();
        keyboardLogic = new KeyboardLogic(pia);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('reset should call wireResetCallback if provided', () => {
        const wireResetCallback = jest.fn();
        keyboardLogic.wire({ reset: wireResetCallback });
        keyboardLogic.reset();

        expect(wireResetCallback).toHaveBeenCalled();
    });

    test('reset should not throw if wireResetCallback is not provided', () => {
        expect(() => {
            keyboardLogic.reset();
        }).not.toThrow();
    });

    test('write should call reset if RESET_CODE is provided', () => {
        const wireResetCallback = jest.fn();
        keyboardLogic.wire({ reset: wireResetCallback });
        keyboardLogic.write(-255);

        expect(wireResetCallback).toHaveBeenCalled();
    });

    test('write should call read, write and setCA1 if not RESET_CODE', async () => {
        const testChar = 65; // ASCII 'A'
        mockRead.mockReturnValue(0x04); // Mock CRA with bit 2 set

        await keyboardLogic.write(testChar);

        expect(mockRead).toHaveBeenCalledWith(1); // Read CRA
        expect(mockWrite).toHaveBeenCalledWith(0, 193); // Write to ORA: 65 | 128 (bit 7 set)
        expect(mockSetCA1).toHaveBeenCalledWith(false); // First ensure CA1 is low
        expect(mockSetCA1).toHaveBeenCalledWith(true); // Then raise CA1
    });
});
