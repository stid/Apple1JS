/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: 'jsdom',
    roots: ['<rootDir>/src'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
    testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    setupFiles: ['jest-canvas-mock'],
    setupFilesAfterEnv: ['<rootDir>/src/test-support/setupTests.ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    collectCoverage: false,
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/*.test.{ts,tsx}',
        '!src/**/*.spec.{ts,tsx}',
        '!src/test-support/**',
        '!src/progs/**',
        '!src/version.ts',
    ],
    coverageThreshold: {
        global: {
            branches: 90,
            functions: 90,
            lines: 90,
            statements: 90,
        },
        'src/core/**/*.{ts,tsx}': {
            branches: 90,
            functions: 90,
            lines: 90,
            statements: 90,
        },
    },
    coverageReporters: ['text', 'lcov', 'html'],
    testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '/build/',
    ],
};
