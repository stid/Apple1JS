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

    test('Should hold PB7 busy while the wired write is pending, then release it', async function () {
        // Set up PIA to access Output Register B (CRB bit 2 = 1)
        pia.write(3, 0x04);
        let release!: () => void;
        displayLogic.wire({
            write: () =>
                new Promise<void>((resolve) => {
                    release = resolve;
                }),
        });

        const pending = displayLogic.write(65);
        // Observed mid-write: an implementation that never raises PB7, or
        // drops it before the sink resolves, fails here.
        expect(pia.read(2) & 0x80, 'PB7 busy while the write is pending').toBe(0x80);

        release();
        await pending;
        expect(pia.read(2) & 0x80, 'PB7 ready once the write resolved').toBe(0x00);
    });

    test('Should release PB7 even when the wired write rejects', async function () {
        pia.write(3, 0x04);
        displayLogic.wire({ write: () => Promise.reject(new Error('video sink failed')) });

        await expect(displayLogic.write(65)).rejects.toThrow('video sink failed');
        // A rejected sink must not strand the monitor's ECHO loop on a busy display.
        expect(pia.read(2) & 0x80, 'PB7 must not stay busy after a failed write').toBe(0x00);
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
