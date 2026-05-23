import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/test-support/vitest-setup.ts'],
        include: ['src/**/*.vitest.{test,spec}.{js,jsx,ts,tsx}'],
        exclude: ['node_modules', 'dist', 'build'],
        testTimeout: 10000, // 10 second timeout per test
        hookTimeout: 10000, // 10 second timeout for hooks
        maxWorkers: 2, // Limit parallel test workers (minWorkers removed in Vitest 4)
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov', 'html'],
            exclude: [
                'src/**/*.d.ts',
                'src/**/*.test.{ts,tsx}',
                'src/**/*.spec.{ts,tsx}',
                'src/test-support/**',
                'src/progs/**',
                'src/version.ts',
            ],
            thresholds: {
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
        },
        reporters: ['default', 'junit'],
        outputFile: {
            junit: './test-results/junit.xml',
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
