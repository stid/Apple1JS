# ADR-005: Bus-based Memory Architecture

**Status**: Existing pattern, documented

**Date**: Original implementation

## Context

Need flexible memory mapping for different address ranges (RAM, ROM, I/O).

## Decision

Central Bus component with binary search and LRU cache for address resolution.

Update 2026-11: the LRU cache was replaced by a per-page decode table, with the binary search
kept for pages that are only partly mapped (see `docs/active/wasm-performance.md`).

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
