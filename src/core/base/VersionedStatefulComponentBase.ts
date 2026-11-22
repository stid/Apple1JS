/**
 * Base class for versioned, stateful emulated-hardware components.
 *
 * Every core component (RAM, ROM, Clock, PIA6820, Apple1) used to hand-roll the
 * identical `loadState` preamble: migrate if the stored version differs ->
 * validate (optional) -> apply. This template method fixes that invariant sequence
 * once and defers only the component-specific application to {@link applyState},
 * so a fix to the validate/migrate guard lands in a single place.
 *
 * Subclasses keep ownership of `saveState`, `validateState`, `migrateState`,
 * `resetState`, `getStateVersion`, and `getSupportedVersions` — those are
 * genuinely per-component. They implement `applyState` (the body that used to
 * follow the preamble) and expose `stateComponentName` for error messages.
 */
import {
    IVersionedStatefulComponent,
    StateBase,
    StateOptions,
    StateValidationResult,
    StateError,
    StateManager,
} from '../types';

export abstract class VersionedStatefulComponentBase<
    TState extends StateBase,
> implements IVersionedStatefulComponent<TState> {
    /** Human-readable label used in {@link StateError} messages (e.g. 'RAM'). */
    protected abstract readonly stateComponentName: string;

    abstract saveState(options?: StateOptions): TState;
    abstract validateState(state: unknown): StateValidationResult;
    abstract migrateState(oldState: StateBase, fromVersion: string): TState;
    abstract getStateVersion(): string;
    abstract getSupportedVersions(): string[];
    abstract resetState(): void;

    /**
     * Apply an already-validated, already-migrated state to the component.
     * This is the part that used to follow the duplicated preamble in each class.
     */
    protected abstract applyState(state: TState, options: Required<StateOptions>): void;

    loadState(state: TState, options?: StateOptions): void {
        const opts = { ...StateManager.defaultStateOptions(), ...options };
        const finalState = this.prepareLoad(state, opts);
        this.applyState(finalState, opts);
    }

    /**
     * Validate (when requested) and migrate (when the stored version differs)
     * a state object, returning the state that should be applied.
     */
    protected prepareLoad(state: TState, opts: Required<StateOptions>): TState {
        // Migrate first: validateState checks the *current* schema, so an older
        // state missing fields that a migration adds would be rejected before the
        // migration could run.
        const current =
            opts.migrate && state.version && state.version !== this.getStateVersion()
                ? this.migrateState(state, state.version)
                : state;

        if (opts.validate) {
            const validation = this.validateState(current);
            if (!validation.valid) {
                throw new StateError(
                    `Invalid ${this.stateComponentName} state: ${validation.errors.join(', ')}`,
                    this.stateComponentName,
                    'load',
                );
            }
        }

        return current;
    }
}
