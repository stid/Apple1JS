/**
 * State Management Types for Apple1JS
 * 
 * Provides standardized interfaces for component state serialization,
 * versioning, and validation across the entire emulator.
 */

/**
 * Base interface for any serializable state object
 */
export interface StateBase {
    /** Schema version for backward compatibility */
    readonly version?: string;
    /** Optional metadata for debugging */
    readonly metadata?: {
        timestamp?: number;
        componentId?: string;
        [key: string]: unknown;
    };
}

/**
 * Result of state validation operations
 */
export interface StateValidationResult {
    /** Whether the state is valid */
    valid: boolean;
    /** Error messages if validation failed */
    errors: string[];
    /** Warning messages for non-critical issues */
    warnings: string[];
}

/**
 * Options for state operations
 */
export interface StateOptions {
    /** Whether to include debugging information */
    includeDebugInfo?: boolean;
    /** Whether to validate state before operations */
    validate?: boolean;
    /** Whether to perform migration if version mismatch */
    migrate?: boolean;
    /** Whether to include runtime/transient state */
    includeRuntimeState?: boolean;
}

/**
 * Standard interface for components that can save and restore their state
 * 
 * This interface provides a consistent pattern for state management across
 * all Apple1JS components, enabling reliable serialization, deserialization,
 * and validation.
 * 
 * @template TState The type of state object this component manages
 */
export interface IStatefulComponent<TState extends StateBase = StateBase> {
    /**
     * Save the current state of the component
     * 
     * @param options Configuration for state saving
     * @returns The current state object
     */
    saveState(options?: StateOptions): TState;

    /**
     * Restore the component from a saved state
     * 
     * @param state The state to restore
     * @param options Configuration for state loading
     * @throws {StateError} If the state is invalid or incompatible
     */
    loadState(state: TState, options?: StateOptions): void;

    /**
     * Validate a state object for this component
     * 
     * @param state The state to validate
     * @returns Validation result with errors and warnings
     */
    validateState(state: unknown): StateValidationResult;

    /**
     * Reset the component to its initial state
     * 
     * This should return the component to the same state as
     * when it was first constructed/initialized.
     */
    resetState(): void;

    /**
     * Get the current schema version for this component's state
     */
    getStateVersion(): string;

    /**
     * Check if the component's state has changed since last save
     * 
     * @returns True if state has been modified
     */
    isStateDirty?(): boolean;

    /**
     * Mark the component's state as clean (unchanged)
     */
    markStateClean?(): void;
}

/**
 * Enhanced interface for components that support state versioning and migration
 */
export interface IVersionedStatefulComponent<TState extends StateBase = StateBase> 
    extends IStatefulComponent<TState> {
    /**
     * Migrate state from an older version to the current version
     * 
     * @param oldState State from a previous version
     * @param fromVersion The version of the old state
     * @returns Migrated state in current version format
     */
    migrateState(oldState: StateBase, fromVersion: string): TState;

    /**
     * Get list of supported state versions for migration
     * 
     * @returns Array of version strings this component can migrate from
     */
    getSupportedVersions(): string[];
}

/**
 * Interface for components that manage collections of stateful sub-components
 */
export interface ICompositeStatefulComponent<TState extends StateBase = StateBase> 
    extends IStatefulComponent<TState> {
    /**
     * Get all child components that have state
     * 
     * @returns Map of component IDs to their stateful instances
     */
    getStatefulChildren(): Map<string, IStatefulComponent>;

    /**
     * Save state including all child components
     * 
     * @param options Configuration for state saving
     * @returns Composite state including all children
     */
    saveStateRecursive(options?: StateOptions): TState;

    /**
     * Load state including all child components
     * 
     * @param state Composite state to restore
     * @param options Configuration for state loading
     */
    loadStateRecursive(state: TState, options?: StateOptions): void;
}

/**
 * Type-safe state management utility functions
 */
export class StateManager {
    /**
     * Type guard to check if an object implements IStatefulComponent
     */
    static isStateful(obj: unknown): obj is IStatefulComponent {
        return typeof obj === 'object' && 
               obj !== null && 
               'saveState' in obj && 
               'loadState' in obj && 
               'validateState' in obj && 
               'resetState' in obj && 
               'getStateVersion' in obj;
    }

    /**
     * Type guard to check if an object implements IVersionedStatefulComponent
     */
    static isVersionedStateful(obj: unknown): obj is IVersionedStatefulComponent {
        return StateManager.isStateful(obj) && 
               'migrateState' in obj && 
               'getSupportedVersions' in obj;
    }

    /**
     * Type guard to check if an object implements ICompositeStatefulComponent
     */
    static isCompositeStateful(obj: unknown): obj is ICompositeStatefulComponent {
        return StateManager.isStateful(obj) && 
               'getStatefulChildren' in obj && 
               'saveStateRecursive' in obj && 
               'loadStateRecursive' in obj;
    }

    /**
     * Validate state version compatibility
     */
    static isVersionCompatible(
        currentVersion: string, 
        stateVersion: string | undefined,
        supportedVersions: string[]
    ): boolean {
        if (!stateVersion) return true; // No version means latest
        if (stateVersion === currentVersion) return true;
        return supportedVersions.includes(stateVersion);
    }

    /**
     * Create default state options
     */
    static defaultStateOptions(): Required<StateOptions> {
        return {
            includeDebugInfo: false,
            validate: true,
            migrate: true,
            includeRuntimeState: false
        };
    }
}

/**
 * Error thrown when state operations fail
 */
export class StateError extends Error {
    constructor(
        message: string,
        public readonly component?: string,
        public readonly operation?: 'save' | 'load' | 'validate' | 'migrate',
        public readonly details?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'StateError';
    }
}

/**
 * Mixin for adding state dirty tracking to components
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withStateDirtyTracking<T extends new (...args: any[]) => object>(Base: T) {
    return class extends Base {
        private _stateDirty = false;

        protected markStateDirty(): void {
            this._stateDirty = true;
        }

        isStateDirty(): boolean {
            return this._stateDirty;
        }

        markStateClean(): void {
            this._stateDirty = false;
        }
    };
}

/**
 * Decorator for automatically marking state as dirty when methods are called
 */
export function dirtyOnCall(_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function(this: unknown, ...args: unknown[]) {
        const result = originalMethod.apply(this, args);
        if (typeof this === 'object' && this !== null && 'markStateDirty' in this && typeof this.markStateDirty === 'function') {
            this.markStateDirty();
        }
        return result;
    };
    
    return descriptor;
}