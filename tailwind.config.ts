import type { Config } from 'tailwindcss';
import { tokenDerivedTheme } from './src/styles/tailwind-tokens';

/**
 * Tailwind theme is DERIVED from `src/styles/tokens.ts` via `tailwind-tokens.ts`.
 * Do not hand-edit colors/spacing/typography here — change the tokens instead.
 * The token↔Tailwind parity test guards against drift.
 *
 * The extras below (glow box-shadows, animations, keyframes) are intentionally
 * NOT token-derived — they are presentation effects, not palette values.
 */
const config: Config = {
    content: ['./src/**/*.{html,js,ts,jsx,tsx}'],
    theme: {
        extend: {
            fontFamily: tokenDerivedTheme.fontFamily,
            fontSize: tokenDerivedTheme.fontSize,
            fontWeight: tokenDerivedTheme.fontWeight,
            lineHeight: tokenDerivedTheme.lineHeight,
            letterSpacing: tokenDerivedTheme.letterSpacing,
            colors: tokenDerivedTheme.colors,
            spacing: tokenDerivedTheme.spacing,

            // Non-token-derived presentation extras (see tokens.ts boxShadow.green)
            boxShadow: {
                'glow-green': '0 0 20px rgba(0, 255, 0, 0.3)',
                'glow-subtle': '0 0 10px rgba(0, 255, 0, 0.1)',
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease-in-out',
                'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
            },
        },
    },
    plugins: [],
};

export default config;
