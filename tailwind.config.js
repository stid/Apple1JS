/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./src/**/*.{html,js,ts,jsx,tsx}'],
    theme: {
        extend: {
            // Typography system - keeping for legacy components not yet migrated
            fontSize: {
                'xs': '0.875rem',   // 14px - Labels, metadata
                'sm': '1rem',       // 16px - Body text, values
                'base': '1.125rem', // 18px - Main content
                'lg': '1.5rem',     // 24px - Headers, important data
                'xl': '1.75rem',    // 28px - Section titles
            },
            fontWeight: {
                'normal': 400,
                'medium': 500,
                'semibold': 600,
                'bold': 700,
            },
            lineHeight: {
                'tight': 1.25,
                'normal': 1.5,
                'relaxed': 1.75,
            },
            letterSpacing: {
                'normal': '0',
                'wide': '0.025em',
                'wider': '0.05em',
            },
            
            // Color system - aligned with design tokens
            colors: {
                // Data type colors
                'data-address': '#34D399',
                'data-value': '#34D399',
                'data-flag': '#F59E0B',
                'data-status': '#8B5CF6',
                
                // Semantic colors
                'semantic': {
                    'success': '#10B981',
                    'warning': '#F59E0B',
                    'error': '#EF4444',
                    'info': '#3B82F6',
                },
                
                // Apple 1 phosphor theme
                'phosphor': {
                    'primary': '#00FF00',
                    'secondary': '#00D000',
                    'dim': '#00A000',
                    'glow': '#00FF0030',
                },
                
                // Surface colors
                'surface': {
                    'primary': '#1E293B',
                    'secondary': '#0F172A', // Updated to match design tokens background.secondary
                    'tertiary': '#334155',
                    'quaternary': '#475569',
                    'overlay': '#00000060',
                },
                
                // Border colors
                'border': {
                    'primary': '#374151',
                    'secondary': '#4B5563',
                    'accent': '#10B981',
                    'subtle': '#1F2937',
                },
                
                // Text colors
                'text': {
                    'primary': '#F3F4F6',
                    'secondary': '#9CA3AF',
                    'tertiary': '#6B7280',
                    'accent': '#10B981',
                    'muted': '#6B7280',
                },
                
                // Component type colors
                'component': {
                    'ram': '#3B82F6',      // Blue (info color)
                    'rom': '#F59E0B',      // Amber (warning color)
                    'bus': '#10B981',      // Green (success color)
                    'cpu': '#EF4444',      // Red (error color)
                    'pia': '#8B5CF6',      // Purple (status color)
                    'io': '#06B6D4',       // Cyan
                    'clock': '#F97316',    // Orange
                },
            },
            
            // Spacing system
            spacing: {
                'xs': '0.25rem',     // 4px
                'sm': '0.5rem',      // 8px
                'md': '1rem',        // 16px
                'lg': '1.5rem',      // 24px
                'xl': '2rem',        // 32px
                'xxl': '3rem',       // 48px
                'xxxl': '4rem',      // 64px
            },
            
            // Box shadows
            boxShadow: {
                'glow-green': '0 0 20px rgba(0, 255, 0, 0.3)',
                'glow-subtle': '0 0 10px rgba(0, 255, 0, 0.1)',
            },
            
            // Animation
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
