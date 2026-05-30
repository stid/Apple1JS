/**
 * Tailwind adapter — the single mapping from design tokens to Tailwind's flat
 * theme shape. Both `tailwind.config.ts` and the parity test consume this, so
 * the Tailwind theme can never drift from `tokens.ts`.
 *
 * Only token-derived sections live here. Non-token extras (glow box-shadows,
 * animations, keyframes, CRT specifics) stay literal in the Tailwind config by
 * design — see `docs/active/design-system.md`.
 */
import { designTokens } from './tokens';

const { colors, spacing, typography } = designTokens;

export const tokenDerivedTheme = {
    colors: {
        // Data type colors + hover variants
        'data-address': colors.address,
        'data-address-hover': colors.dataHover.address,
        'data-value': colors.value,
        'data-value-hover': colors.dataHover.value,
        'data-flag': colors.flag,
        'data-status': colors.status,

        // Semantic colors (flat + nested convenience object)
        success: colors.success,
        warning: colors.warning,
        error: colors.error,
        info: colors.info,
        'toggle-active': colors.toggleActive,
        'toggle-inactive': colors.toggleInactive,
        semantic: {
            success: colors.success,
            warning: colors.warning,
            error: colors.error,
            info: colors.info,
            toggleActive: colors.toggleActive,
            toggleInactive: colors.toggleInactive,
        },

        // Apple 1 phosphor theme
        phosphor: {
            primary: colors.phosphor.primary,
            secondary: colors.phosphor.secondary,
            dim: colors.phosphor.dim,
            glow: colors.phosphor.glow,
        },

        // Surface colors
        surface: {
            primary: colors.surface.primary,
            secondary: colors.surface.secondary,
            tertiary: colors.surface.tertiary,
            quaternary: colors.surface.quaternary,
            overlay: colors.surface.overlay,
            hover: colors.surface.hover,
            sunken: colors.surface.sunken,
        },

        // Border colors
        border: {
            primary: colors.border.primary,
            secondary: colors.border.secondary,
            accent: colors.border.accent,
            subtle: colors.border.subtle,
        },

        // Text colors
        text: {
            primary: colors.text.primary,
            secondary: colors.text.secondary,
            tertiary: colors.text.tertiary,
            accent: colors.text.accent,
            muted: colors.text.muted,
            disabled: colors.text.disabled,
        },

        // Component type colors — PascalCase token keys → lowercase Tailwind keys.
        // CPU and CPU6502 are the same token value; both collapse to `cpu`.
        component: {
            ram: colors.componentColors.RAM,
            rom: colors.componentColors.ROM,
            bus: colors.componentColors.Bus,
            cpu: colors.componentColors.CPU6502,
            pia: colors.componentColors.PIA6820,
            io: colors.componentColors.IoComponent,
            clock: colors.componentColors.Clock,
        },
    },

    fontFamily: {
        mono: typography.fontFamily.mono,
    },
    spacing: { ...spacing },
    fontSize: { ...typography.fontSize },
    // Tailwind's Config type wants string values; tokens store these as numbers.
    // Stringifying here keeps a single source of truth (CSS output is identical).
    fontWeight: Object.fromEntries(Object.entries(typography.fontWeight).map(([k, v]) => [k, String(v)])) as Record<
        keyof typeof typography.fontWeight,
        string
    >,
    lineHeight: Object.fromEntries(Object.entries(typography.lineHeight).map(([k, v]) => [k, String(v)])) as Record<
        keyof typeof typography.lineHeight,
        string
    >,
    letterSpacing: { ...typography.letterSpacing },
} as const;
