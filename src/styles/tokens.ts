/**
 * Design tokens for Apple1JS emulator
 * Provides consistent design system values for typography, colors, spacing, and other design elements
 */

export const designTokens = {
    // Typography scale - monospace for authentic terminal feel
    typography: {
        fontFamily: {
            mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        },
        fontSize: {
            xs: '0.875rem', // 14px - Labels, metadata
            sm: '1rem', // 16px - Body text, values
            base: '1.125rem', // 18px - Main content
            lg: '1.5rem', // 24px - Headers, important data
            xl: '1.75rem', // 28px - Section titles
        },
        fontWeight: {
            normal: 400,
            medium: 500,
            semibold: 600,
            bold: 700,
        },
        lineHeight: {
            tight: 1.25,
            normal: 1.5,
            relaxed: 1.75,
        },
        letterSpacing: {
            normal: '0',
            wide: '0.025em',
            wider: '0.05em',
        },
    },

    // Color system - Apple 1 inspired palette
    colors: {
        // Data type colors
        address: '#34D399', // Green for memory addresses (matches CRT phosphor)
        value: '#34D399', // Green for data values
        flag: '#F59E0B', // Amber for CPU flags
        status: '#8B5CF6', // Purple for status info

        // Semantic colors
        success: '#10B981', // Green for success/active states
        warning: '#F59E0B', // Amber for warnings
        error: '#EF4444', // Red for errors
        info: '#3B82F6', // Blue for informational

        // Apple 1 phosphor green theme
        phosphor: {
            primary: '#00FF00', // Bright green
            secondary: '#00D000', // Medium green
            dim: '#00A000', // Dark green
            glow: '#00FF0030', // Green with transparency
        },

        // Neutral grays
        neutral: {
            50: '#F9FAFB',
            100: '#F3F4F6',
            200: '#E5E7EB',
            300: '#D1D5DB',
            400: '#9CA3AF',
            500: '#6B7280',
            600: '#4B5563',
            700: '#374151',
            800: '#1F2937',
            900: '#111827',
            950: '#0F172A',
        },

        // Background colors
        background: {
            primary: '#000000', // Pure black
            secondary: '#0F172A', // Very dark slate
            surface: '#1E293B', // Dark slate
            overlay: '#00000060', // Black with 60% opacity
        },

        // Border colors
        border: {
            primary: '#374151', // Gray-700
            secondary: '#4B5563', // Gray-600
            accent: '#10B981', // Green accent
            subtle: '#1F2937', // Gray-800
        },

        // Text colors
        text: {
            primary: '#F3F4F6', // Light gray
            secondary: '#9CA3AF', // Medium gray
            accent: '#10B981', // Green accent
            muted: '#6B7280', // Darker gray
        },

        // Component type colors for consistent mapping
        componentColors: {
            RAM: '#3B82F6',      // Blue (info color)
            ROM: '#F59E0B',      // Amber (warning color)
            Bus: '#10B981',      // Green (success color)
            CPU: '#EF4444',      // Red (error color)
            CPU6502: '#EF4444',  // Red (error color)
            PIA6820: '#8B5CF6',  // Purple (status color)
            IoComponent: '#06B6D4', // Cyan
            Clock: '#F97316',    // Orange
        },
    },

    // Spacing system - consistent spacing scale
    spacing: {
        xs: '0.25rem', // 4px
        sm: '0.5rem', // 8px
        md: '1rem', // 16px
        lg: '1.5rem', // 24px
        xl: '2rem', // 32px
        xxl: '3rem', // 48px
        xxxl: '4rem', // 64px
    },

    // Border radius
    borderRadius: {
        none: '0',
        sm: '0.125rem', // 2px
        base: '0.25rem', // 4px
        md: '0.375rem', // 6px
        lg: '0.5rem', // 8px
        xl: '0.75rem', // 12px
        full: '9999px', // Full rounded
    },

    // Shadows
    boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        green: '0 0 20px rgba(0, 255, 0, 0.3)', // Green glow effect
    },

    // Transitions
    transition: {
        fast: '100ms ease-in-out',
        base: '150ms ease-in-out',
        slow: '300ms ease-in-out',
    },

    // Component-specific tokens
    components: {
        // CRT display
        crt: {
            backgroundColor: '#0F172A',
            borderColor: '#374151',
            textColor: '#10B981',
            glowColor: '#00FF0030',
            scanlineOpacity: '0.1',
        },

        // Inspector panel
        inspector: {
            backgroundColor: '#1E293B',
            borderColor: '#374151',
            sectionSpacing: '1.5rem',
            itemSpacing: '0.5rem',
        },

        // Buttons
        button: {
            borderRadius: '9999px',
            padding: '0.25rem 1rem',
            fontSize: '1rem',
            fontWeight: 500,
            letterSpacing: '0.025em',
            transition: '150ms ease-in-out',
        },

        // Metrics cards
        metricCard: {
            backgroundColor: '#00000040',
            borderColor: '#374151',
            borderRadius: '0.5rem',
            padding: '0.75rem',
            spacing: '0.25rem',
        },
    },
} as const;

// Type exports for TypeScript support
export type DesignTokens = typeof designTokens;
export type FontSize = keyof typeof designTokens.typography.fontSize;
export type Color = keyof typeof designTokens.colors;
export type Spacing = keyof typeof designTokens.spacing;
