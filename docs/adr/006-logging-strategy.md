# ADR-006: Logging Strategy

**Status**: Implemented

**Date**: 2024-12

## Context

Need consistent logging across components without console.log pollution.

## Decision

Centralized LoggingService with:

- Three log levels (info, warn, error)
- Handler-based architecture for UI integration
- Development-only console output
- Component source identification

## Consequences

### Positive

- Clean production logs
- UI integration capability
- Consistent format

### Negative

- Requires discipline to use LoggingService instead of console.log

## Implementation

See `src/services/LoggingService.ts` and `src/contexts/LoggingContext.tsx` for the logging implementation.
