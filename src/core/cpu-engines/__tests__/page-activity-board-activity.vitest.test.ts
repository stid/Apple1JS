/**
 * board-activity: the JS engine counts the CPU's bus accesses per page.
 */
import { describe, test, expect, beforeEach } from 'vitest';
import { JSEngine } from '../JSEngine';
import CPU6502 from '../../cpu6502';
import {
    PROGRAM,
    PROGRAM_START,
    describeActivity,
    expectedActivity,
    makeAppleBus,
    runProgram,
} from './page-activity-board-activity.fixture';

describe('page activity — JS engine', () => {
    let engine: JSEngine;

    beforeEach(() => {
        engine = new JSEngine(makeAppleBus().bus);
    });

    test('AC-1: counts the reads and writes the CPU makes to each page', () => {
        runProgram(engine);

        expect(describeActivity(engine.getPageActivity())).toEqual(describeActivity(expectedActivity()));
    });

    test('AC-1: reset clears the counts, including the reset vector fetch', () => {
        runProgram(engine);
        engine.reset();

        expect(describeActivity(engine.getPageActivity())).toEqual([]);
    });

    test('AC-1: the returned array is a copy', () => {
        runProgram(engine);
        engine.getPageActivity().fill(0);

        expect(describeActivity(engine.getPageActivity())).toEqual(describeActivity(expectedActivity()));
    });

    test('AC-1: the counters are 32-bit and wrap, like the WASM engine', () => {
        const cpu = new CPU6502(makeAppleBus().bus);
        cpu.pageActivity[0x03] = 0xffffffff;
        cpu.pageActivity[256 + 0x03] = 0xffffffff;

        cpu.read(0x0300);
        cpu.write(0x0300, 0);

        expect(engine.getPageActivity()).toBeInstanceOf(Uint32Array);
        expect([cpu.pageActivity[0x03], cpu.pageActivity[256 + 0x03]]).toEqual([0, 0]);
    });

    test('AC-3: debugger reads, writes and program loads are not counted', () => {
        engine.reset();
        engine.loadProgram(PROGRAM, PROGRAM_START);
        engine.read(0x0300);
        engine.write(0xe000, 0x55);
        engine.readRange(0x0000, 0x200);
        engine.readRange(0xd000, 0x20);
        engine.writeRange(0x0400, new Uint8Array([1, 2, 3]));

        expect(describeActivity(engine.getPageActivity())).toEqual([]);
    });
});
