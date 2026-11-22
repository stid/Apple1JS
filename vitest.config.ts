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
        // jsdom setup dominated the run under the default pool (one environment per file).
        // vmThreads creates it once per worker and keeps per-file isolation.
        pool: 'vmThreads',
        maxWorkers: 2, // Limit parallel test workers (minWorkers removed in Vitest 4)
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov', 'html'],
            include: ['src/**/*.{ts,tsx}'],
            exclude: [
                'src/**/*.d.ts',
                'src/**/__tests__/**',
                'src/**/*.test.{ts,tsx}',
                'src/__integration__/**',
                'src/test-support/**',
                'src/test-utils/**',
                'src/apple1/progs/**',
                'src/apple1/roms/**',
                'src/wasm/**',
                'src/version.ts',
            ],
            // Floors, set just under the measured numbers (2026-11) so a drop fails
            // the run. Ratchet them up as coverage improves. Note the WASM engine
            // cannot execute under Node, so WasmEngine.ts weighs on the core figure.
            // Vitest takes the overall thresholds at the top level; a `global:` key
            // (Jest syntax) is treated as a file glob and silently matches nothing.
            thresholds: {
                lines: 62,
                statements: 61,
                functions: 62,
                branches: 50,
                'src/core/**/*.{ts,tsx}': {
                    lines: 66,
                    statements: 65,
                    functions: 68,
                    branches: 50,
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
            '@': path.resolve(import.meta.dirname, './src'),
        },
    },
});
