/**
 * Utility functions for using design tokens in React components
 */

import { designTokens } from './tokens';

/**
 * Get font size token value
 */
export const fontSize = (size: keyof typeof designTokens.typography.fontSize) => {
    return designTokens.typography.fontSize[size];
};

/**
 * Get font weight token value
 */
export const fontWeight = (weight: keyof typeof designTokens.typography.fontWeight) => {
    return designTokens.typography.fontWeight[weight];
};

/**
 * Get line height token value
 */
export const lineHeight = (height: keyof typeof designTokens.typography.lineHeight) => {
    return designTokens.typography.lineHeight[height];
};

/**
 * Get letter spacing token value
 */
export const letterSpacing = (spacing: keyof typeof designTokens.typography.letterSpacing) => {
    return designTokens.typography.letterSpacing[spacing];
};

/**
 * Get color token value using safe nested access
 */
export const color = (colorPath: string): string => {
    const paths = colorPath.split('.');
    let value: unknown = designTokens.colors;
    
    for (const path of paths) {
        if (typeof value === 'object' && value !== null && path in value) {
            value = (value as Record<string, unknown>)[path];
        } else {
            throw new Error(`Color token not found: ${colorPath}`);
        }
    }
    
    if (typeof value !== 'string') {
        throw new Error(`Color token is not a string: ${colorPath}`);
    }
    
    return value;
};

/**
 * Get spacing token value
 */
export const spacing = (space: keyof typeof designTokens.spacing) => {
    return designTokens.spacing[space];
};

/**
 * Get border radius token value
 */
export const borderRadius = (radius: keyof typeof designTokens.borderRadius) => {
    return designTokens.borderRadius[radius];
};

/**
 * Get box shadow token value
 */
export const boxShadow = (shadow: keyof typeof designTokens.boxShadow) => {
    return designTokens.boxShadow[shadow];
};

/**
 * Get transition token value
 */
export const transition = (trans: keyof typeof designTokens.transition) => {
    return designTokens.transition[trans];
};

/**
 * Typography style object generator
 */
export const typography = {
    xs: {
        fontSize: fontSize('xs'),
        fontFamily: designTokens.typography.fontFamily.mono,
    },
    sm: {
        fontSize: fontSize('sm'),
        fontFamily: designTokens.typography.fontFamily.mono,
    },
    base: {
        fontSize: fontSize('base'),
        fontFamily: designTokens.typography.fontFamily.mono,
    },
    lg: {
        fontSize: fontSize('lg'),
        fontFamily: designTokens.typography.fontFamily.mono,
    },
    xl: {
        fontSize: fontSize('xl'),
        fontFamily: designTokens.typography.fontFamily.mono,
    },
} as const;

/**
 * Common style combinations
 */
export const styles = {
    // Button styles
    button: {
        borderRadius: borderRadius('full'),
        padding: `${spacing('xs')} ${spacing('md')}`,
        fontSize: fontSize('sm'),
        fontWeight: fontWeight('medium'),
        letterSpacing: letterSpacing('wide'),
        transition: transition('base'),
        fontFamily: designTokens.typography.fontFamily.mono,
    },
    
    // Action button variants
    actionButton: {
        display: 'inline-block',
        padding: `${spacing('sm')} ${spacing('md')}`,
        borderRadius: borderRadius('lg'),
        fontSize: fontSize('xs'),
        fontFamily: designTokens.typography.fontFamily.mono,
        letterSpacing: letterSpacing('wide'),
        transition: transition('base'),
        textDecoration: 'none',
        cursor: 'pointer',
        border: '1px solid',
        outline: 'none',
    },
    
    // Metric card styles
    metricCard: {
        backgroundColor: designTokens.components.metricCard.backgroundColor,
        borderColor: designTokens.components.metricCard.borderColor,
        borderRadius: designTokens.components.metricCard.borderRadius,
        padding: designTokens.components.metricCard.padding,
    },
    
    // Input styles
    input: {
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        borderColor: designTokens.colors.border.primary,
        fontSize: fontSize('xs'),
        fontFamily: designTokens.typography.fontFamily.mono,
        padding: `${spacing('xs')} ${spacing('sm')}`,
        borderRadius: borderRadius('base'),
        transition: transition('base'),
    },
} as const;

/**
 * Button variant generators
 */
export const buttonVariants = {
    success: (isHovered: boolean = false) => ({
        ...styles.actionButton,
        backgroundColor: isHovered ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)',
        borderColor: isHovered ? color('success') : 'rgba(16, 185, 129, 0.3)',
        color: color('success'),
    }),
    
    address: (isHovered: boolean = false) => ({
        ...styles.actionButton,
        backgroundColor: isHovered ? 'rgba(96, 165, 250, 0.2)' : 'rgba(96, 165, 250, 0.1)',
        borderColor: isHovered ? color('address') : 'rgba(96, 165, 250, 0.3)',
        color: color('address'),
    }),
    
    warning: (isHovered: boolean = false) => ({
        ...styles.actionButton,
        backgroundColor: isHovered ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.1)',
        borderColor: isHovered ? color('warning') : 'rgba(245, 158, 11, 0.3)',
        color: color('warning'),
    }),
} as const;