import PIA6820 from '../../core/PIA6820';
import KeyboardLogic from '../KeyboardLogic';

const mockSetDataA = jest.fn();
const mockSetBitCtrA = jest.fn();
const mockSetCA1 = jest.fn();

jest.mock('../../core/PIA6820', () => {
    return jest.fn().mockImplementation(() => {
        return {
            setDataA: mockSetDataA,
            setBitCtrA: mockSetBitCtrA,
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

    test('write should call setDataA and setCA1 if not RESET_CODE', async () => {
        const testChar = 65; // ASCII 'A'

        await keyboardLogic.write(testChar);

        expect(mockSetDataA).toHaveBeenCalledWith(193); // 65 | 128 (bit 7 set)
        expect(mockSetCA1).toHaveBeenCalledWith(true);
    });
});
