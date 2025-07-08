# ADR-005: Bus-based Memory Architecture

**Status**: Existing pattern, documented

**Date**: Original implementation

## Context

Need flexible memory mapping for different address ranges (RAM, ROM, I/O).

## Decision

Central Bus component with binary search and LRU cache for address resolution.

## Consequences

### Positive
- Flexible memory mapping
- Good performance with caching
- Clean abstraction

### Negative
- Additional indirection layer
- Cache management complexity

## Implementation

See `src/core/Bus.ts` for the bus implementation with binary search and caching.