# Apple1JS Architectural Decisions

This document records significant architectural decisions made in the Apple1JS project, following the Architecture Decision Record (ADR) format.

## ADR-001: Error Handling Strategy

**Status**: Implemented

**Context**: The codebase had inconsistent error handling with some components throwing errors, others logging, and some failing silently. This made debugging difficult and behavior unpredictable.

**Decision**: Implement a centralized error handling system with:

- Custom error classes extending from `EmulatorError` base class
- Component-specific error types (BusError, CPUError, MemoryError, StateError)
- Centralized `ErrorHandler` utility for consistent error processing
- Integration with existing LoggingService for error reporting

**Consequences**:

- **Positive**: Consistent error handling across all components, better debugging, clear error context
- **Negative**: Slight overhead from error object creation, requires updating all error throw statements

## ADR-002: TypeScript Strict Mode

**Status**: Implemented

**Context**: TypeScript strict mode provides better type safety but was already enabled in the project configuration.

**Decision**: Maintain strict mode configuration with all strict checks enabled, including:

- `strict: true` (enables all strict type checking options)
- `noImplicitAny: true`
- `strictNullChecks: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`

**Consequences**:

- **Positive**: Catches more errors at compile time, better IDE support, safer refactoring
- **Negative**: None significant, as the codebase was already compliant

## ADR-003: Component Inspection Pattern

**Status**: Existing pattern, documented

**Context**: Need for consistent component state inspection for debugging tools.

**Decision**: Use `IInspectableComponent` interface with standardized `getInspectable()` method returning structured data.

**Consequences**:

- **Positive**: Uniform debugging interface, easy integration with inspector UI
- **Negative**: Maintenance overhead to keep inspection data updated

## ADR-004: Web Worker Isolation

**Status**: Existing pattern, documented

**Context**: UI responsiveness requires separating emulation from rendering.

**Decision**: Run emulation in Web Worker, communicate via structured messages.

**Consequences**:

- **Positive**: Non-blocking UI, better performance, clean separation of concerns
- **Negative**: Complexity of message passing, serialization overhead

## ADR-005: Bus-based Memory Architecture

**Status**: Existing pattern, documented

**Context**: Need flexible memory mapping for different address ranges (RAM, ROM, I/O).

**Decision**: Central Bus component with binary search and LRU cache for address resolution.

**Consequences**:

- **Positive**: Flexible memory mapping, good performance with caching, clean abstraction
- **Negative**: Additional indirection layer, cache management complexity

## ADR-006: Logging Strategy

**Status**: Implemented

**Context**: Need consistent logging across components without console.log pollution.

**Decision**: Centralized LoggingService with:

- Three log levels (info, warn, error)
- Handler-based architecture for UI integration
- Development-only console output
- Component source identification

**Consequences**:

- **Positive**: Clean production logs, UI integration capability, consistent format
- **Negative**: Requires discipline to use LoggingService instead of console.log

## ADR-007: State Serialization

**Status**: Existing pattern, documented

**Context**: Need to save/restore emulator state for persistence.

**Decision**: Each component implements saveState()/loadState() methods with versioned formats.

**Consequences**:

- **Positive**: Clean state persistence, backward compatibility support
- **Negative**: Version management complexity, serialization overhead

## ADR-008: Design System Implementation

**Status**: Implemented

**Context**: UI had inconsistent styling with mixed font sizes, colors, and spacing.

**Decision**: Implement design tokens system with:

- Consistent typography scale
- Semantic color palette
- Standardized spacing system
- Component-based architecture

**Consequences**:

- **Positive**: Consistent UI, easier maintenance, better user experience
- **Negative**: Initial refactoring effort, ongoing token maintenance

## Future Considerations

### Performance Optimizations

- Consider WASM for CPU emulation if JavaScript performance becomes limiting
- Investigate SharedArrayBuffer for zero-copy Worker communication
- Profile and optimize hot paths in Bus component

### Testing Strategy

- Increase test coverage to >90% for core components
- Add integration tests for state save/restore
- Implement performance regression tests

### Documentation

- Maintain inline JSDoc comments for all public APIs
- Keep architectural decisions updated
- Document emulation accuracy limitations
