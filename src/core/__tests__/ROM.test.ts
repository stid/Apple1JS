import ROM from '../ROM';
import { loggingService } from '../../services/LoggingService';

describe('ROM', function () {
    let testRom: ROM;

    beforeEach(function () {
        testRom = new ROM();
        jest.spyOn(loggingService, 'warn').mockImplementation();
        jest.spyOn(loggingService, 'info').mockImplementation();
        jest.spyOn(loggingService, 'error').mockImplementation();
    });

    afterEach(function () {
        jest.restoreAllMocks();
    });

    test('Should bulk load', function () {
        testRom.flash([1, 2, 3, 4, 5]);
        expect(testRom.read(0x00)).toBe(0x03);
        expect(testRom.read(0x01)).toBe(0x04);
        expect(testRom.read(0x02)).toBe(0x05);
    });

    test('Should not write (read only)', function () {
        testRom.write(0x0a, 0xab); // This will just be ignored
        expect(testRom.read(0x0a)).toBe(0x00);
    });

    test('Should log write attempts to read-only memory', function () {
        testRom.write(0x10, 0xFF);
        
        expect(loggingService.warn).toHaveBeenCalledWith('ROM', expect.stringContaining('Attempt to write'));
    });

    test('Should validate flash data format', function () {
        const errorSpy = jest.spyOn(loggingService, 'error');
        
        testRom.flash([]);
        expect(errorSpy).toHaveBeenCalledWith('ROM', expect.stringContaining('at least 2 bytes'));
        
        testRom.flash(['invalid' as unknown as number, 0, 1, 2]);
        expect(errorSpy).toHaveBeenCalledWith('ROM', expect.stringContaining('must be numbers'));
    });

    test('Should handle non-numeric data in flash', function () {
        const warnSpy = jest.spyOn(loggingService, 'warn');
        
        testRom.flash([0x00, 0x00, 1, 'invalid' as unknown as number, 3]);
        
        expect(warnSpy).toHaveBeenCalledWith('ROM', expect.stringContaining('Non-numeric data'));
        expect(testRom.read(0x01)).toBe(0); // Should use 0 for invalid data
    });

    test('Should log successful flash operations', function () {
        const infoSpy = jest.spyOn(loggingService, 'info');
        
        testRom.flash([0x00, 0x00, 0xAA, 0xBB]);
        
        expect(infoSpy).toHaveBeenCalledWith('ROM', expect.stringContaining('Flashed'));
    });
});
