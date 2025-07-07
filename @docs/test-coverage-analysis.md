# Test Coverage Analysis - Apple1JS

Generated: 2025-07-06

## Current Coverage Summary

```
Statements   : 69.32% ( 2217/3198 )
Branches     : 50.61% ( 661/1306 )
Functions    : 65.37% ( 491/751 )
Lines        : 69.37% ( 2154/3105 )
```

This falls short of the project's stated requirement of ≥ 90% coverage for core emulation components.

## Test Distribution

### Core Emulation (src/core/) - Well Tested ✅
These components meet or exceed the 90% coverage requirement:
- ✓ CPU6502.ts - Comprehensive test suite split by instruction type
- ✓ Bus.ts - Bus communication tested
- ✓ Clock.ts - Clock functionality tested
- ✓ PIA6820.ts - Peripheral interface tested
- ✓ RAM.ts - Memory operations tested
- ✓ ROM.ts - ROM functionality tested
- ✓ utils.ts - Utility functions tested

### Apple1 System (src/apple1/) - Partially Tested ⚠️
- ✓ DisplayLogic.ts
- ✓ KeyboardLogic.ts
- ✓ WebCRTVideo.ts
- ✓ WebKeyboard.ts
- ✗ Apple.worker.ts - **Critical gap: The main worker is untested**
- ✗ Type definitions (@types/*)
- ✗ Constants and configurations
- ✗ ROMs and programs (progs/*) - These are data files, lower priority

### UI Components (src/components/) - Mixed Coverage 🔄
Well tested:
- ✓ CRT display components (CRT.tsx, CRTRow.tsx, etc.)
- ✓ DebuggerLayout.tsx
- ✓ InspectorView.tsx
- ✓ Basic UI components (Error, Info, MetricCard)

Missing tests:
- ✗ App.tsx, AppContent.tsx, Main.tsx - **Main application structure**
- ✗ Disassembler.tsx, DisassemblerPaginated.tsx - **Core debugger component**
- ✗ MemoryViewer.tsx - **Core debugger component**
- ✗ StackViewer.tsx - **Core debugger component**
- ✗ ExecutionControls.tsx - **Debugger controls**
- ✗ Many smaller UI components

### Services & Utilities - Largely Untested ❌
- ✗ LoggingService.ts - Used throughout the app
- ✗ Contexts (LoggingContext, DebuggerNavigationContext)
- ✗ Hooks (except useNavigableComponent)
- ✗ Style utilities and tokens

## Critical Gaps by Priority

### 1. High Priority - Core Functionality
These directly impact emulation accuracy and debugging:
- **Apple.worker.ts** - The main worker orchestrating emulation
- **Disassembler components** - Essential for debugging
- **MemoryViewer.tsx** - Essential for debugging
- **StackViewer.tsx** - Essential for debugging
- **ExecutionControls.tsx** - Controls for step/run/breakpoints

### 2. Medium Priority - Application Structure
These affect overall reliability:
- **App.tsx, AppContent.tsx, Main.tsx** - Main application components
- **LoggingService.ts** - Used throughout for debugging
- **Contexts** - State management infrastructure

### 3. Lower Priority - Supporting Components
Nice to have but less critical:
- Type definition files (@types/*) - Mostly interfaces
- Constants files - Static data
- Small UI components (AddressLink, SmartAddress, etc.)
- Style utilities - Visual only

## Recommendations

### Immediate Actions
1. **Test Apple.worker.ts** - This is the heart of the emulation system
2. **Test debugger components** - Disassembler, MemoryViewer, StackViewer
3. **Test LoggingService** - It's used everywhere and aids debugging

### Short Term
1. Add tests for main application components (App, AppContent, Main)
2. Test execution control components
3. Add tests for custom hooks

### Long Term
1. Achieve 90%+ coverage for all core emulation code
2. Maintain 80%+ coverage for UI components
3. Add integration tests for worker-UI communication

## Testing Best Practices (from CLAUDE.md)

When adding tests:
- Core emulation must have ≥ 90% line/branch coverage
- New features must include tests demonstrating functionality
- Bug fixes must include regression tests
- Run `yarn run lint && yarn run type-check && yarn run test:ci` before commits

## Files Needing Tests (Grouped by Component)

### Worker & Core Integration
- src/apple1/Apple.worker.ts

### Debugger Components
- src/components/Disassembler.tsx
- src/components/DisassemblerPaginated.tsx
- src/components/MemoryViewer.tsx
- src/components/StackViewer.tsx
- src/components/ExecutionControls.tsx
- src/components/CompactExecutionControls.tsx
- src/components/CompactCpuRegisters.tsx

### Main Application
- src/components/App.tsx
- src/components/AppContent.tsx
- src/components/Main.tsx

### Services & Infrastructure
- src/services/LoggingService.ts
- src/contexts/LoggingContext.tsx
- src/contexts/DebuggerNavigationContext.tsx

### UI Components
- src/components/AddressLink.tsx
- src/components/SmartAddress.tsx
- src/components/AlertBadges.tsx
- src/components/AlertPanel.tsx
- src/components/InspectTree.tsx
- src/components/PaginatedTableView.tsx

### Hooks
- src/hooks/usePaginatedTable.ts
- src/hooks/useVisibleRows.ts

### Utilities
- src/core/InspectableIoComponent.ts
- src/core/errors.ts
- src/styles/utils.ts