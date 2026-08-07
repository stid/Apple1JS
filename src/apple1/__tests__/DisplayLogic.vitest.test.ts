import { describe, test, expect, beforeEach, vi } from 'vitest';
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

        // The busy line is now held for a fixed number of EMULATED cycles
        // rather than being cleared when the write returns, so drive it from a
        // controllable cycle source.
        let cycles = 0;
        pia.wireCycleProvider(() => cycles);

        await displayLogic.write(65);

        expect(pia.read(2) & 0x80).toBe(0x80); // busy while the field elapses

        cycles = 30_000;
        expect(pia.read(2) & 0x80).toBe(0x00); // ready once it has
    });

    test('Should call wired write callback with correct value', async function () {
        const mockWriteCallback = vi.fn();
        const wireOptions = {
            write: mockWriteCallback,
        };

        displayLogic.wire(wireOptions);
        await displayLogic.write(65);

        expect(mockWriteCallback).toHaveBeenCalledWith(65);
    });

    test('Should call wired reset callback when reset is triggered', function () {
        const mockResetCallback = vi.fn();
        const wireOptions = {
            reset: mockResetCallback,
        };

        displayLogic.wire(wireOptions);
        displayLogic.reset();
        
        expect(mockResetCallback).toHaveBeenCalled();
    });
});
