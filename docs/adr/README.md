# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for the Apple1JS project.

## What is an ADR?

An Architecture Decision Record captures a significant architectural decision made along with its context and consequences.

## ADR Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [001](001-error-handling-strategy.md) | Error Handling Strategy | Implemented | 2024-12 |
| [002](002-typescript-strict-mode.md) | TypeScript Strict Mode | Implemented | 2024-12 |
| [003](003-component-inspection-pattern.md) | Component Inspection Pattern | Existing pattern | Original |
| [004](004-web-worker-isolation.md) | Web Worker Isolation | Existing pattern | Original |
| [005](005-bus-based-memory-architecture.md) | Bus-based Memory Architecture | Existing pattern | Original |
| [006](006-logging-strategy.md) | Logging Strategy | Implemented | 2024-12 |
| [007](007-state-serialization.md) | State Serialization | Enhanced v4.18.8 | Original |
| [008](008-design-system-implementation.md) | Design System Implementation | Implemented | 2024-12 |

## ADR Format

Each ADR follows this format:

- **Title**: ADR-NNN: Short descriptive title
- **Status**: Draft, Proposed, Accepted, Implemented, Superseded
- **Date**: When the decision was made
- **Context**: What prompted this decision
- **Decision**: What we decided to do
- **Consequences**: What happens as a result (positive and negative)
- **Implementation**: Where to find the implementation