# ADR-007: State Serialization

**Status**: Existing pattern, documented

**Date**: Original implementation, enhanced in v4.18.8

## Context

Need to save/restore emulator state for persistence.

## Decision

Each component implements saveState()/loadState() methods with versioned formats using the `IVersionedStatefulComponent` interface.

## Consequences

### Positive

- Clean state persistence
- Backward compatibility support
- Version migration capability

### Negative

- Version management complexity
- Serialization overhead

## Implementation

See `src/core/types/state.ts` for the interface definitions and any component implementing `IVersionedStatefulComponent`.
