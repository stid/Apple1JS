/**
 * Design tokens for Apple1JS — the single source of truth for the UI palette,
 * type, spacing and radii.
 *
 * Values follow the stid design system: Catppuccin Mocha surfaces, Peach accent,
 * Geist + Geist Mono, a 4px grid and square-ish radii. Dark only. The CRT display
 * keeps its own hand-tuned phosphor colours and is not driven by these tokens.
 */

export const designTokens = {
    typography: {
        fontFamily: {
            // UI, labels, prose
            sans: '"Geist Variable", "Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
            // Data: addresses, bytes, registers, code, keyboard keys
            mono: '"Geist Mono Variable", "Geist Mono", "MesloLGS Nerd Font Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
        },
        fontSize: {
            '2xs': '0.6875rem', // 11px - eyebrows, badges
            xs: '0.75rem', // 12px - captions, metadata, dense controls
            sm: '0.8125rem', // 13px - UI body and data tables
            base: '0.9375rem', // 15px - card titles
            lg: '1.25rem', // 20px - emphasised values
            xl: '1.5625rem', // 25px - page-level headings
        },
        fontWeight: {
            normal: 400,
            medium: 500,
            semibold: 600,
            bold: 700,
        },
        lineHeight: {
            tight: 1.15,
            normal: 1.5,
            relaxed: 1.75,
        },
        letterSpacing: {
            tight: '-0.015em', // headings
            normal: '0',
            wide: '0.02em',
            caps: '0.12em', // uppercase mono eyebrows
        },
    },

    colors: {
        // Data type colors
        address: '#89b4fa', // Blue - memory addresses (the prompt-path colour)
        value: '#a6e3a1', // Green - data values; echoes the CRT phosphor
        flag: '#f9e2af', // Yellow - CPU flags
        status: '#cba6f7', // Mauve - status info, mnemonics

        dataHover: {
            address: '#b4befe', // Lavender
            value: '#94e2d5', // Teal
        },

        // Semantic colors
        success: '#a6e3a1', // Green
        warning: '#f9e2af', // Yellow
        error: '#f38ba8', // Red
        info: '#74c7ec', // Sapphire

        // Toggle states — a stateful feature's ON takes the accent, OFF goes neutral.
        toggleActive: '#fab387', // Peach
        toggleInactive: '#6c7086', // Overlay0

        // Apple 1 phosphor green (CRT-adjacent effects only)
        phosphor: {
            primary: '#00FF00',
            secondary: '#00D000',
            dim: '#00A000',
            glow: '#00FF0030',
        },

        // Surface ramp, deepest to most raised: sunken < secondary < base < primary < tertiary < quaternary
        surface: {
            base: '#1e1e2e', // Page background
            primary: '#313244', // Cards, raised panels (surface0)
            secondary: '#181825', // Toolbars, table headers, inputs (mantle)
            tertiary: '#45475a', // Nested panels (surface1)
            quaternary: '#585b70', // Active, pressed (surface2)
            overlay: '#11111b99', // Scrim behind overlays (crust at 60%)
            hover: '#45475a', // Hover lift over primary (== tertiary; semantic alias)
            sunken: '#11111b', // Deepest wells: code blocks, the CRT bezel (crust)
        },

        border: {
            primary: '#2a2a3c', // Hairline between base and cards
            secondary: '#45475a', // Stronger line: buttons, inputs
            accent: '#fab387', // Peach
            subtle: '#2a2a3c', // Dividers inside a card (== primary; semantic alias)
        },

        text: {
            primary: '#cdd6f4', // Main copy
            secondary: '#a6adc8', // Secondary copy, labels
            tertiary: '#7f849c', // Metadata, captions
            accent: '#fab387', // Peach - links, active tab, focus
            accentHover: '#ffc9a3', // Lighter peach
            onAccent: '#11111b', // Text on an accent or status fill
            muted: '#7f849c', // == tertiary; semantic alias
            disabled: '#6c7086', // Disabled, placeholders
        },

        // Component type colors for consistent mapping
        componentColors: {
            RAM: '#89b4fa', // Blue
            ROM: '#f9e2af', // Yellow
            Bus: '#a6e3a1', // Green
            CPU: '#f38ba8', // Red
            CPU6502: '#f38ba8', // Red
            PIA6820: '#cba6f7', // Mauve
            IoComponent: '#94e2d5', // Teal
            Clock: '#fab387', // Peach
        },
    },

    // Spacing on a 4px grid
    spacing: {
        xxs: '0.125rem', // 2px
        xs: '0.25rem', // 4px
        sm: '0.5rem', // 8px
        md: '1rem', // 16px
        lg: '1.5rem', // 24px
        xl: '2rem', // 32px
        xxl: '3rem', // 48px
        xxxl: '4rem', // 64px
    },

    // Radii — square-ish, terminal not bubbly
    borderRadius: {
        none: '0',
        sm: '3px', // Inputs, badges, chips
        md: '5px', // Buttons
        lg: '8px', // Cards, panels
        xl: '12px', // Large surfaces
        full: '9999px', // Status dots, spinners only
    },

    // Shadows — low, soft, cool-tinted. Surfaces are separated by borders, not shadow.
    boxShadow: {
        sm: '0 1px 2px rgba(17, 17, 27, 0.30)',
        md: '0 2px 8px rgba(17, 17, 27, 0.35)',
        lg: '0 8px 28px rgba(17, 17, 27, 0.45)',
    },
} as const;

// Type exports for TypeScript support
export type DesignTokens = typeof designTokens;
