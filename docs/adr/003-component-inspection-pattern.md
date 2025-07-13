# ADR-003: Component Inspection Pattern

**Status**: Existing pattern, documented

**Date**: Original implementation

## Context

Need for consistent component state inspection for debugging tools.

## Decision

Use `IInspectableComponent` interface with standardized `getInspectable()` method returning structured data.

## Consequences

### Positive

- Uniform debugging interface
- Easy integration with inspector UI
- Runtime introspection without performance impact

### Negative

- Maintenance overhead to keep inspection data updated

## Implementation

See `src/core/types/components.ts` for the interface definition and any component implementing `IInspectableComponent`.
