/**
 * Token ↔ Tailwind parity guard.
 *
 * `tokens.ts` is the single source of truth; `tailwind.config.ts` derives its
 * token-facing theme from the same adapter (`tailwind-tokens.ts`). This test
 * asserts the *resolved* Tailwind theme contains exactly the adapter-derived
 * values, so the two can never drift again. The non-token-derived extras
 * (glow box-shadows, animations, keyframes) are intentionally NOT covered here.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Config } from 'tailwindcss';
import { tokenDerivedTheme } from '../tailwind-tokens';
import { designTokens } from '../tokens';
// The TS Tailwind config at repo root, derived from tokens via the adapter.
import tailwindConfig from '../../../tailwind.config';

// Tailwind v4 removed `tailwindcss/resolveConfig`. The JS config (loaded at
// runtime via `@config`) wires the adapter into `theme.extend`, so we assert
// against that directly — this still guards the token↔config wiring against
// drift. Index through a loose record to address arbitrary token-derived keys.
const resolved = (tailwindConfig as Config).theme?.extend as unknown as Record<string, Record<string, unknown>>;

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

    it('derives the mono font family from tokens', () => {
        expect(resolved.fontFamily?.mono).toEqual(tokenDerivedTheme.fontFamily.mono);
        expect(tokenDerivedTheme.fontFamily.mono).toBe(designTokens.typography.fontFamily.mono);
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

    // v4-cleanup: tokens that repair previously-dead component classes
    // (`bg-surface-hover`, `text-text-disabled`) and replace hardcoded translucent
    // blacks (`bg-black/{40,20}` → `bg-surface-sunken/{40,20}`).
    it('exposes the surface.hover / surface.sunken / text.disabled repair tokens', () => {
        const surface = tokenDerivedTheme.colors.surface as Record<string, string>;
        const text = tokenDerivedTheme.colors.text as Record<string, string>;
        expect(surface.hover, 'surface.hover').toBe('#334155');
        expect(surface.sunken, 'surface.sunken').toBe('#000000');
        expect(text.disabled, 'text.disabled').toBe('#6B7280');
        // and they must be wired into the resolved Tailwind theme, not just the adapter
        expect((resolved.colors?.surface as Record<string, string>)?.hover).toBe('#334155');
        expect((resolved.colors?.surface as Record<string, string>)?.sunken).toBe('#000000');
        expect((resolved.colors?.text as Record<string, string>)?.disabled).toBe('#6B7280');
    });

    // `py-xxs` was used by four components before `spacing.xxs` existed; Tailwind
    // silently emitted no CSS for it (zero vertical padding on badges).
    it('exposes the spacing.xxs repair token', () => {
        expect(tokenDerivedTheme.spacing.xxs, 'spacing.xxs').toBe('0.125rem');
        expect(resolved.spacing?.xxs).toBe('0.125rem');
    });

    // Reverse guard: every named spacing suffix a component uses must be a token.
    // Tailwind's JIT drops unknown utilities without warning, so a typo or a
    // missing token is invisible to the build and only shows up as broken layout.
    it('every named spacing class used in components resolves to a token', () => {
        const tokenKeys = new Set(Object.keys(tokenDerivedTheme.spacing));
        const builtin = new Set(['auto', 'px']);
        const classPattern = /(?<![\w-])-?(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|space-x|space-y)-([a-z]+)(?![\w-])/g;
        const componentsDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'components');
        const files = readdirSync(componentsDir, { recursive: true, encoding: 'utf8' }).filter(
            (f) => f.endsWith('.tsx') && !f.includes('__tests__')
        );
        const unknown = new Set<string>();
        for (const file of files) {
            const source = readFileSync(join(componentsDir, file), 'utf8');
            for (const match of source.matchAll(classPattern)) {
                const suffix = match[1];
                if (!tokenKeys.has(suffix) && !builtin.has(suffix)) {
                    unknown.add(`${file}: ${match[0]}`);
                }
            }
        }
        expect([...unknown]).toEqual([]);
    });
});
