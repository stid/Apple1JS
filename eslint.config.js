// ESLint Flat Config for React + TypeScript + Vite (ESLint 9.x)
import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jest from 'eslint-plugin-jest';
import prettier from 'eslint-config-prettier';

export default [
    js.configs.recommended,
    {
        ignores: ['src/wasm/**/*.js', 'src/wasm/**/*.d.ts'],
    },
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                project: './tsconfig.json',
                ecmaVersion: 'latest',
                sourceType: 'module',
                ecmaFeatures: { jsx: true },
            },
            globals: {
                window: true,
                self: true,
                document: true,
                console: true,
                setTimeout: true,
                clearTimeout: true,
                setInterval: true,
                clearInterval: true,
                fetch: true,
                Response: true,
                Request: true,
                URL: true,
                TextEncoder: true,
                TextDecoder: true,
                WebAssembly: true,
                performance: true,
                process: true,
                module: true,
                require: true,
                // Removed custom types from globals; TypeScript handles these.
            },
        },
        plugins: {
            '@typescript-eslint': tseslint,
            react,
            'react-hooks': reactHooks,
        },
        rules: {
            ...tseslint.configs.recommended.rules,
            ...react.configs.recommended.rules,
            // react-hooks v7's `recommended` preset expands from 2 rules to 16,
            // adding the experimental React Compiler rules (purity, refs,
            // immutability, set-state-in-render, ...) mostly as errors. We pin to
            // the two rules historically enforced (v5 recommended) to keep this
            // dependency bump behavior-neutral; adopting the Compiler rules is a
            // separate, deliberate change (they currently flag ~11 pre-existing
            // patterns across contexts/ and hooks/worker/).
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
            'react/react-in-jsx-scope': 'off',
            ...prettier.rules,
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
    },
    {
        files: [
            '**/*.test.ts',
            '**/*.test.tsx',
            '**/*.test.js',
            '**/*.test.jsx',
            '**/__tests__/**/*.ts',
            '**/__tests__/**/*.tsx',
        ],
        plugins: {
            jest,
        },
        settings: {
            // jest is not installed (project uses Vitest); eslint-plugin-jest's
            // rules apply to the identical describe/it/expect API, but its version
            // auto-detection needs an explicit version to avoid a load error.
            jest: { version: 29 },
        },
        rules: {
            ...jest.configs.recommended.rules,
        },
        languageOptions: {
            globals: {
                jest: true,
                test: true,
                expect: true,
                describe: true,
                it: true,
                beforeEach: true,
                afterEach: true,
            },
        },
    },
];
