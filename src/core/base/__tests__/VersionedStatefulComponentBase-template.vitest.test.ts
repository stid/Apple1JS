import { VersionedStatefulComponentBase } from '../VersionedStatefulComponentBase';
import { baseInspectable } from '../inspectable';
import { StateError } from '../../types';
import type { StateBase, StateOptions, StateValidationResult } from '../../types';
import type { InspectableData, WithBusMetadata } from '../../types';

interface FakeState extends StateBase {
    value: number;
}

/**
 * Minimal concrete subclass that records how the base template drives it, so we
 * can assert the validate -> migrate -> apply sequence without a real component.
 */
class FakeComponent extends VersionedStatefulComponentBase<FakeState> {
    protected readonly stateComponentName = 'Fake';

    // Test spies / knobs
    valid = true;
    applied: FakeState | null = null;
    migrateCalledWith: { from: string } | null = null;

    static readonly STATE_VERSION = '2.0';

    saveState(): FakeState {
        return { version: FakeComponent.STATE_VERSION, value: this.applied?.value ?? 0 };
    }

    validateState(): StateValidationResult {
        return this.valid
            ? { valid: true, errors: [], warnings: [] }
            : { valid: false, errors: ['bad value'], warnings: [] };
    }

    migrateState(oldState: StateBase, fromVersion: string): FakeState {
        this.migrateCalledWith = { from: fromVersion };
        return { ...(oldState as FakeState), version: FakeComponent.STATE_VERSION, value: 999 };
    }

    getStateVersion(): string {
        return FakeComponent.STATE_VERSION;
    }

    getSupportedVersions(): string[] {
        return ['1.0', '2.0'];
    }

    resetState(): void {
        this.applied = null;
    }

    protected applyState(state: FakeState): void {
        this.applied = state;
    }
}

describe('VersionedStatefulComponentBase template', () => {
    it('applies a valid, current-version state directly (no migration)', () => {
        const c = new FakeComponent();
        c.loadState({ version: '2.0', value: 42 });
        expect(c.applied).toEqual({ version: '2.0', value: 42 });
        expect(c.migrateCalledWith).toBeNull();
    });

    it('throws a StateError tagged with the component name when validation fails', () => {
        const c = new FakeComponent();
        c.valid = false;
        const thrown = (() => {
            try {
                c.loadState({ version: '2.0', value: 1 });
                return null;
            } catch (e) {
                return e as StateError;
            }
        })();
        expect(thrown).toBeInstanceOf(StateError);
        expect(thrown?.message).toContain('Invalid Fake state');
        expect(thrown?.component).toBe('Fake');
        expect(thrown?.operation).toBe('load');
        expect(c.applied).toBeNull();
    });

    it('migrates when the stored version differs, then applies the migrated state', () => {
        const c = new FakeComponent();
        c.loadState({ version: '1.0', value: 7 });
        expect(c.migrateCalledWith).toEqual({ from: '1.0' });
        expect(c.applied).toEqual({ version: '2.0', value: 999 });
    });

    it('skips validation when validate:false', () => {
        const c = new FakeComponent();
        c.valid = false; // would throw if validation ran
        c.loadState({ version: '2.0', value: 5 }, { validate: false } as StateOptions);
        expect(c.applied).toEqual({ version: '2.0', value: 5 });
    });

    it('skips migration when migrate:false even on a version mismatch', () => {
        const c = new FakeComponent();
        c.loadState({ version: '1.0', value: 5 }, { migrate: false } as StateOptions);
        expect(c.migrateCalledWith).toBeNull();
        expect(c.applied).toEqual({ version: '1.0', value: 5 });
    });
});

describe('baseInspectable helper', () => {
    const component = { id: 'x', type: 'X', name: 'thing' };

    it('returns id/type/name and merges extra fields', () => {
        const out: InspectableData = baseInspectable(component, { size: 10 });
        expect(out).toMatchObject({ id: 'x', type: 'X', name: 'thing', size: 10 });
        expect('address' in out).toBe(false);
        expect('addressName' in out).toBe(false);
    });

    it('includes address metadata only when present on the component', () => {
        const withAddr = { ...component } as WithBusMetadata<typeof component>;
        withAddr.__address = '0xD010';
        withAddr.__addressName = 'PIA';
        const out = baseInspectable(withAddr);
        expect(out.address).toBe('0xD010');
        expect(out.addressName).toBe('PIA');
    });

    it('defaults name to empty string when undefined', () => {
        const out = baseInspectable({ id: 'y', type: 'Y' });
        expect(out.name).toBe('');
    });
});
