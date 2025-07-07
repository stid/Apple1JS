# Type Consolidation Plan

## Current State

Types are currently scattered across multiple locations:
- `src/@types/` - Contains only Config.ts
- `src/types/` - Contains only logging.ts  
- `src/core/@types/` - Core emulation types
- `src/apple1/@types/` - Apple1-specific types
- `src/services/@types/` - Service layer types

## Proposed Structure

Consolidate all types into a unified structure under `src/types/`:

```
src/types/
├── index.ts              # Re-exports all types
├── config.ts             # App configuration
├── logging.ts            # Logging types (already here)
├── core/                 # Core emulation types
│   ├── index.ts
│   ├── bus.ts            # Bus, BusComponent
│   ├── cpu.ts            # CPU6502State, CPU6502Debug
│   ├── clock.ts          # ClockTypes, IClockable
│   ├── inspectable.ts    # IInspectableComponent, InspectableTypes
│   └── io.ts             # IoComponent, IoAddressable, IoLogic
├── apple1/               # Apple1-specific types
│   ├── index.ts
│   ├── emulator.ts       # EmulatorState
│   ├── messages.ts       # WORKER_MESSAGES
│   └── components.ts     # Apple1-specific component types
└── ui/                   # UI-related types
    ├── index.ts
    └── contexts.ts       # Context types
```

## Migration Steps

1. Create the new directory structure
2. Move types from scattered locations to the new structure
3. Update all imports across the codebase
4. Remove old type directories
5. Update tsconfig paths if needed

## Benefits

- Single source of truth for all types
- Clear organization by domain
- Easier to find and maintain types
- Better IDE support with centralized exports
- Follows TypeScript best practices