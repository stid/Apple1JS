# ADR-004: Web Worker Isolation

**Status**: Existing pattern, documented

**Date**: Original implementation

## Context

UI responsiveness requires separating emulation from rendering.

## Decision

Run emulation in Web Worker, communicate via structured messages.

## Consequences

### Positive

- Non-blocking UI
- Better performance
- Clean separation of concerns

### Negative

- Complexity of message passing
- Serialization overhead

## Implementation

See `src/apple1/Apple.worker.ts` and `src/apple1/types/worker-messages.ts` for the Worker implementation and message protocol.
