import { describe, test, expect, beforeEach } from 'vitest';
import WebKeyboard from '../WebKeyboard';

describe('WebKeyboard', function () {
    let webKeyboard: WebKeyboard;

    beforeEach(function () {
        webKeyboard = new WebKeyboard();
    });

    test('Should Wire & write 65', async function () {
        await new Promise((resolve, reject) => {
            webKeyboard.wire({
                write: async (value) => {
                    try {
                        expect(value).toBe(65);
                        resolve(undefined);
                    } catch (err) {
                        reject(err);
                    }
                },
            });
            webKeyboard.write('A');
        });
    });

    test('Should Wire & write Backspace', async function () {
        await new Promise((resolve, reject) => {
            webKeyboard.wire({
                write: async (value) => {
                    try {
                        expect(value).toBe(223);
                        resolve(undefined);
                    } catch (err) {
                        reject(err);
                    }
                },
            });
            webKeyboard.write('Backspace');
        });
    });

    test('Should Wire & write Escape', async function () {
        await new Promise((resolve, reject) => {
            webKeyboard.wire({
                write: async (value) => {
                    try {
                        expect(value).toBe(155);
                        resolve(undefined);
                    } catch (err) {
                        reject(err);
                    }
                },
            });
            webKeyboard.write('Escape');
        });
    });

    test('Should Wire & write Enter', async function () {
        await new Promise((resolve, reject) => {
            webKeyboard.wire({
                write: async (value) => {
                    try {
                        expect(value).toBe(141);
                        resolve(undefined);
                    } catch (err) {
                        reject(err);
                    }
                },
            });
            webKeyboard.write('Enter');
        });
    });

    test('Should Wire & result 65', async function () {
        webKeyboard.wire({
            write: async (value) => {
                return value;
            },
        });
        const result = await webKeyboard.write('A');
        expect(result).toBe(65);
    });
});
