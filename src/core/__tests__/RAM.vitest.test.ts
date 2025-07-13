import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import RAM from '../RAM';
import { loggingService } from '../../services/LoggingService';

describe('RAM', function () {
    let testRam: RAM;
    beforeEach(function () {
        testRam = new RAM();
        vi.spyOn(loggingService, 'warn').mockImplementation();
        vi.spyOn(loggingService, 'info').mockImplementation();
        vi.spyOn(loggingService, 'error').mockImplementation();
    });

    afterEach(function () {
        jest.restoreAllMocks();
    });
    test('Should flash', function () {
        // Should load at 0x0280
        testRam.flash([0x80, 0x02, 1, 2, 3]);
        expect(testRam.read(0x00)).toBe(0x00);
        expect(testRam.read(0x280)).toBe(0x01);
        expect(testRam.read(0x281)).toBe(0x02);
        expect(testRam.read(0x282)).toBe(0x03);
    });

    test('Should write & read', function () {
        testRam.write(0x0a, 0xab);
        expect(testRam.read(0x0a)).toBe(0xab);
    });

    test('Should write at edges', function () {
        const smallRam = new RAM(4);
        smallRam.write(0, 0xab);
        expect(smallRam.read(0)).toBe(0xab);
        smallRam.write(0x3, 0xbb);
        expect(smallRam.read(0x03)).toBe(0xbb);
    });

    test('Should not write if above RAM space', function () {
        const smallRam = new RAM(4);
        smallRam.write(0x03, 0xab);
        expect(smallRam.read(0x03)).toBe(0xab);
        smallRam.write(0x04, 0xab);
        expect(smallRam.read(0x04)).toBe(0);
    });

    test('Should not write if below RAM space', function () {
        const smallRam = new RAM(4);
        smallRam.write(-2, 0xab);
        expect(smallRam.read(-2)).toBe(0);
    });

    test('Should flash content if size == ram space', function () {
        const smallRam = new RAM(6);
        expect(() => smallRam.flash([2, 0, 1, 2, 3, 4])).not.toThrow();
    });

    test('Should log error when flash content exceeds RAM space', function () {
        const smallRam = new RAM(4);
        const errorSpy = vi.spyOn(loggingService, 'error');
        
        smallRam.flash([0, 0, 1, 2, 3, 4, 5]);
        
        expect(errorSpy).toHaveBeenCalledWith('RAM', expect.stringContaining('Flash data too large'));
    });

    test('Should handle invalid read addresses with logging', function () {
        const result1 = testRam.read(-1);
        const result2 = testRam.read(99999);
        
        expect(result1).toBe(0);
        expect(result2).toBe(0);
        expect(loggingService.warn).toHaveBeenCalledWith('RAM', expect.stringContaining('Invalid read address'));
    });

    test('Should handle invalid write addresses with logging', function () {
        testRam.write(-1, 0xAB);
        testRam.write(99999, 0xCD);
        
        expect(loggingService.warn).toHaveBeenCalledWith('RAM', expect.stringContaining('Invalid write address'));
    });

    test('Should mask values over 255 on write', function () {
        testRam.write(0x10, 300);
        
        expect(testRam.read(0x10)).toBe(44); // 300 & 0xFF = 44
        expect(loggingService.info).toHaveBeenCalledWith('RAM', expect.stringContaining('masked to 8-bit'));
    });

    test('Should validate flash data format', function () {
        const errorSpy = vi.spyOn(loggingService, 'error');
        
        testRam.flash([]);
        expect(errorSpy).toHaveBeenCalledWith('RAM', expect.stringContaining('at least 2 bytes'));
        
        testRam.flash(['invalid' as unknown as number, 0, 1, 2]);
        expect(errorSpy).toHaveBeenCalledWith('RAM', expect.stringContaining('must be numbers'));
    });

    test('Should handle non-numeric data in flash', function () {
        const warnSpy = vi.spyOn(loggingService, 'warn');
        
        testRam.flash([0x10, 0x00, 1, 'invalid' as unknown as number, 3]);
        
        expect(warnSpy).toHaveBeenCalledWith('RAM', expect.stringContaining('Non-numeric data'));
        expect(testRam.read(0x11)).toBe(0); // Should use 0 for invalid data
    });
});
