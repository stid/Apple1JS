// ESLint Flat Config for React + TypeScript + Vite (ESLint 8.x compatible)
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
            ...reactHooks.configs.recommended.rules,
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
    {
        files: ['src/apple1/Apple.worker.ts'],
        languageOptions: {
            globals: {
                window: true,
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
                process: true,
                module: true,
                require: true,
                postMessage: true,
                onmessage: true,
                imports: true,
                memory: true,
            },
        },
    },
];
