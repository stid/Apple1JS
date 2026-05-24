/**
 * Token ↔ Tailwind parity guard.
 *
 * `tokens.ts` is the single source of truth; `tailwind.config.ts` derives its
 * token-facing theme from the same adapter (`tailwind-tokens.ts`). This test
 * asserts the *resolved* Tailwind theme contains exactly the adapter-derived
 * values, so the two can never drift again. The non-token-derived extras
 * (glow box-shadows, animations, keyframes) are intentionally NOT covered here.
 */
import { describe, expect, it } from 'vitest';
import resolveConfig from 'tailwindcss/resolveConfig';
import type { Config } from 'tailwindcss';
import { tokenDerivedTheme } from '../tailwind-tokens';
import { designTokens } from '../tokens';
// The TS Tailwind config at repo root, derived from tokens via the adapter.
import tailwindConfig from '../../../tailwind.config';

// Tailwind's resolved theme types use literal keys; index through a loose
// record so the parity loops can address arbitrary token-derived keys.
const resolved = resolveConfig(tailwindConfig as Config).theme as unknown as Record<string, Record<string, unknown>>;

describe('token ↔ Tailwind parity', () => {
    it('exposes every adapter-derived color in the resolved Tailwind theme', () => {
        for (const [key, value] of Object.entries(tokenDerivedTheme.colors)) {
            expect(resolved.colors?.[key], `colors.${key}`).toEqual(value);
        }
    });

    it('exposes every adapter-derived spacing value', () => {
        for (const [key, value] of Object.entries(tokenDerivedTheme.spacing)) {
            expect(resolved.spacing?.[key], `spacing.${key}`).toBe(value);
        }
    });

    it('exposes every adapter-derived typography scale value', () => {
        for (const [key, value] of Object.entries(tokenDerivedTheme.fontSize)) {
            expect(resolved.fontSize?.[key], `fontSize.${key}`).toBe(value);
        }
        for (const [key, value] of Object.entries(tokenDerivedTheme.fontWeight)) {
            expect(resolved.fontWeight?.[key], `fontWeight.${key}`).toBe(value);
        }
        for (const [key, value] of Object.entries(tokenDerivedTheme.lineHeight)) {
            expect(resolved.lineHeight?.[key], `lineHeight.${key}`).toBe(value);
        }
        for (const [key, value] of Object.entries(tokenDerivedTheme.letterSpacing)) {
            expect(resolved.letterSpacing?.[key], `letterSpacing.${key}`).toBe(value);
        }
    });

    it('derives data colors and their hover variants from tokens', () => {
        expect(tokenDerivedTheme.colors['data-address']).toBe(designTokens.colors.address);
        expect(tokenDerivedTheme.colors['data-value']).toBe(designTokens.colors.value);
        expect(tokenDerivedTheme.colors['data-address-hover']).toBe(designTokens.colors.dataHover.address);
        expect(tokenDerivedTheme.colors['data-value-hover']).toBe(designTokens.colors.dataHover.value);
    });

    it('maps PascalCase componentColors to lowercase Tailwind component keys', () => {
        const component = tokenDerivedTheme.colors.component as Record<string, string>;
        expect(component.ram).toBe(designTokens.colors.componentColors.RAM);
        expect(component.rom).toBe(designTokens.colors.componentColors.ROM);
        expect(component.bus).toBe(designTokens.colors.componentColors.Bus);
        // CPU and CPU6502 are the same token value; both collapse to `cpu`.
        expect(component.cpu).toBe(designTokens.colors.componentColors.CPU6502);
        expect(component.pia).toBe(designTokens.colors.componentColors.PIA6820);
        expect(component.io).toBe(designTokens.colors.componentColors.IoComponent);
        expect(component.clock).toBe(designTokens.colors.componentColors.Clock);
    });

    it('locks key hex values against accidental edits', () => {
        expect(tokenDerivedTheme.colors['data-address']).toBe('#34D399');
        expect((tokenDerivedTheme.colors.component as Record<string, string>).cpu).toBe('#EF4444');
        expect((tokenDerivedTheme.colors.surface as Record<string, string>).primary).toBe('#1E293B');
    });
});
