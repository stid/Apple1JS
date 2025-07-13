import { describe, expect } from 'vitest';
import { bitClear, bitSet, bitTest, bitToggle } from '../utils';

describe('bitManipulation', () => {
    describe('bitClear', () => {
        it('should clear the specified bit', () => {
            expect(bitClear(15, 1)).toBe(13);
            expect(bitClear(15, 2)).toBe(11);
        });

        it('should not change the number if the specified bit is already cleared', () => {
            expect(bitClear(12, 0)).toBe(12);
            expect(bitClear(12, 2)).toBe(8);
        });
    });

    describe('bitSet', () => {
        it('should set the specified bit', () => {
            expect(bitSet(12, 0)).toBe(13);
            expect(bitSet(12, 2)).toBe(12);
        });

        it('should not change the number if the specified bit is already set', () => {
            expect(bitSet(15, 1)).toBe(15);
            expect(bitSet(15, 2)).toBe(15);
        });
    });

    describe('bitTest', () => {
        it('should return true if the specified bit is set', () => {
            expect(bitTest(15, 0)).toBe(true);
            expect(bitTest(15, 1)).toBe(true);
        });

        it('should return false if the specified bit is cleared', () => {
            expect(bitTest(12, 0)).toBe(false);
            expect(bitTest(12, 1)).toBe(false);
        });
    });

    describe('bitToggle', () => {
        it('should toggle the specified bit', () => {
            expect(bitToggle(15, 0)).toBe(14);
            expect(bitToggle(12, 0)).toBe(13);
        });

        it('should toggle the specified bit regardless of its initial state', () => {
            expect(bitToggle(12, 1)).toBe(14);
            expect(bitToggle(15, 1)).toBe(13);
        });
    });
});
