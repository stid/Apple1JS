# CLAUDE.md

## 🚨 CRITICAL: Git Workflow Rules

**NEVER commit directly to master!** Always follow this workflow:

1. **Check branch**: `git branch --show-current`
2. **If on master**: `git checkout -b <type>/<description>` (e.g., feat/add-feature, fix/bug-fix)
3. **Make changes**: Edit files as needed
4. **Stage & commit**: `git add -A && git commit -m "<type>: <description>"`
5. **Update version**: Edit `src/version.ts` BEFORE creating PR
6. **Push branch**: `git push -u origin <branch-name>`
7. **Create PR**: `gh pr create --title "..." --body "..."`

**Branch types**: feat/, fix/, perf/, docs/, refactor/, test/, chore/

## 🧠 Project Overview

Apple1JS is a browser-based Apple 1 computer emulator built with TypeScript/React. Features cycle-accurate 6502 CPU emulation, authentic CRT display with phosphor effects, and full debugging capabilities. The architecture separates emulation logic (Web Worker) from UI for performance.

**This is a personal hobby project** - I use it to learn about new technologies and patterns, including exploring AI for coding and feature development. There are no deadlines, sprints, or engineering timelines. If an idea seems interesting, we can explore it at our own pace. I enjoy gap analysis and setting goals, but everything remains driven by passion and learning rather than external pressure.

## 🧠 Claude Instructions

**Working Style**

- Keep documentation informal and focused on learning/exploration
- Avoid corporate language (sprints, deadlines, action items, etc.)
- Frame improvements as "ideas to explore" or "things that would be cool"
- Remember this is a passion project for learning, not a production system

**When Analyzing/Proposing Changes**

- Document findings in `@docs/` folder as informal explorations
- Feel free to suggest improvements, but frame them as opportunities to learn
- No rigid phases - we can analyze and implement as we go

**When Implementing**

- Run tests before/after changes to ensure no regression
- **MANDATORY**: Update `src/version.ts` BEFORE creating any pull request
    - Minor version bump for new features (e.g., 4.11.0 → 4.12.0)
    - Patch version bump for bug fixes (e.g., 4.11.0 → 4.11.1)
    - Major version bump for breaking changes (e.g., 4.11.0 → 5.0.0)
- Run quality checks: `yarn run lint && yarn run type-check && yarn run test:ci`
- **Always ensure new code or components are covered with unit tests following our best practices**

**CRITICAL**: Never create a pull request without updating the version number first!

**Key Principles**

- `IInspectableComponent` enables debugger integration for any component
- UI logging preserves history and aids debugging (no console.log)
- src/progs contains original Apple 1 code - read-only for historical accuracy
- Version bump signals release readiness

## 🛠 Development Commands

- `yarn run dev` / `build` / `preview`
- `yarn run test` / `test:ci`
- `yarn run lint` / `type-check` / `format`

## 🧱 Architecture Overview

- **src/core/**: Emulation engine - 6502 CPU, memory subsystem, clock, bus, PIA 6820
    - Pure TypeScript, no UI dependencies for testability
    - Implements `IInspectableComponent` for runtime introspection
- **src/apple1/**: System integration layer
    - Web Worker isolation prevents UI blocking during emulation
    - Message-based communication via WORKER_MESSAGES protocol
    - Contains original ROM/program data
- **src/components/**: React UI layer
    - CRT display with authentic phosphor rendering
    - Integrated debugger (memory viewer, disassembler, CPU state)
    - Component inspector shows real-time system state
- **src/styles/**: Design token system for consistent theming
- **src/services/**: Cross-cutting concerns (logging, state management)

## 🧩 Key Architectural Patterns

**Memory Architecture** (Apple 1 authentic layout):

- `$0000-$0FFF`: 4KB RAM (includes zero page, stack at $0100-$01FF)
- `$D010-$D013`: PIA 6820 for keyboard/display I/O
- `$E000-$EFFF`: Extended RAM for BASIC interpreter
- `$FF00-$FFFF`: WOZ Monitor ROM

**State Management**:

- `EmulatorState` captures complete system state for save/restore
- Web Worker maintains authoritative state, UI reflects via messages
- Prevents race conditions and ensures consistency

**Component Inspection**:

- `IInspectableComponent` provides `inspect()` method returning debug info
- Enables real-time debugging without performance impact
- Tree structure mirrors hardware architecture

**Performance Considerations**:

- Worker isolation prevents UI blocking during emulation
- Message batching reduces overhead
- TypeScript strict mode catches errors at compile time

## 🚀 Testing & Quality Requirements

**Before ANY commit**:

```bash
yarn run lint && yarn run type-check && yarn run test:ci
```

**Coverage Requirements**:

- Core emulation (CPU, memory, bus): ≥ 90% line/branch coverage
- New features: Must include tests demonstrating functionality
- Bug fixes: Must include regression test

**Why These Matter**:

- TypeScript strict mode catches ~40% of bugs at compile time
- Tests ensure emulation accuracy (critical for vintage software)
- Linting maintains code consistency across contributors

## 🔢 Version Bumps (MANDATORY BEFORE PR)

**ALWAYS update `src/version.ts` before creating any pull request!**

- **Major**: Breaking changes (e.g., 4.11.0 → 5.0.0)
- **Minor**: New features (e.g., 4.11.0 → 4.12.0)
- **Patch**: Bug fixes (e.g., 4.11.0 → 4.11.1)

**Examples:**

- UI refactor with new components = Minor bump
- Fix existing bug = Patch bump
- Change API that breaks compatibility = Major bump

## 🎨 Design System & Colors

**Centralized Design Tokens** (`src/styles/tokens.ts`):
All colors flow from this single source to ensure consistency and enable theming.

**Color Categories & Purpose**:

- **Phosphor**: CRT authenticity (green glow variations)
- **Data Types**: Visual distinction for debugging
    - `data-address` (blue): Memory locations
    - `data-value` (green): Data/registers
    - `data-flag` (amber): CPU flags
- **Semantic**: System status at a glance
- **Component**: Hardware type identification in inspector
- **Surface/Border**: Visual hierarchy through depth

**Critical Exception - CRT Display**:
CRT components use hardcoded colors for historical accuracy:

- `#68D391` for character rendering (matches period CRTs)
- `#0A3A3A` for background (authentic phosphor coating)
  These are intentionally outside the token system.

**Implementation Pattern**:

```typescript
// Modern components
import { designTokens } from '@/styles/tokens';
const color = designTokens.colors.data.address;

// Tailwind (when tokens not available)
<div className="text-data-address" />
```

## 🛠️ Debugger System (July 2025 Implementation)

**DebuggerLayout** (`src/components/DebuggerLayout.tsx`):

- Tabbed interface replacing previous cramped layout
- Three views: Overview (CPU/Stack), Memory, Disassembly
- Maintains state across tab switches for workflow continuity

**MemoryViewer** (`src/components/MemoryViewer.tsx`):

- Hex editor showing 768 bytes (48 rows × 16 bytes)
- Address input with Enter to navigate (like disassembler)
- Arrow navigation with smart scrolling (up=bottom, down=top)
- ASCII representation sidebar
- Ready for edit functionality (infrastructure complete)

**StackViewer** (`src/components/StackViewer.tsx`):

- Real-time 6502 stack visualization ($0100-$01FF)
- Shows active portion only (SP to $FF)
- Usage indicator with color coding (green/yellow/red)
- Current SP position highlighted

**Key Design Decisions**:

- Tabs prevent information overload while keeping tools accessible
- 500ms refresh rate balances responsiveness with performance
- Consistent color coding via design tokens aids quick scanning
- Memory viewer size (768 bytes) fits common use cases without scrolling

## 📍 Current State & Recent Work (July 2025)

**Recently Completed**:

- ✅ **Integrated Debugger**: Replaced cramped layout with tabbed interface after user feedback
    - Previous: All debug info crammed in one view (unusable)
    - Current: Clean tabs for Overview/Memory/Disassembly
    - Key learning: Users need focused views, not information density
- ✅ **Memory Viewer Fixes**:
    - Added address input (was missing, unlike disassembler)
    - Smart scrolling for navigation continuity
    - 768-byte view based on typical debugging sessions
- ✅ **UI Standardization**: Design tokens ensure consistency
    - Except CRT display (intentionally authentic)

**Next Priorities** (from user_experience_analysis.md):

- **Execution Control**: Step/breakpoints/run-to-cursor (infrastructure exists)
- **Memory Search**: Find bytes/strings in memory
- **Watch Expressions**: Monitor memory/register values
- **Hardware Authenticity**: Keyboard sounds, power-on sequence

**Known Issues**:

- Memory editing UI ready but write operations not implemented in worker
- Some linting warnings in user_experience_analysis.md (formatting)

## 📚 Key Concepts

- **PIA 6820**: Peripheral Interface Adapter - handles keyboard input and display output
- **WOZ Monitor**: Steve Wozniak's original ROM monitor program
- **IInspectableComponent**: Our interface enabling any component to provide debug info
- **Design Tokens**: Centralized theme system preventing color chaos
- **Web Worker**: Isolates CPU emulation from UI thread for smooth performance

## 🔗 Reference Materials

- [Apple-1 Operation Manual](https://archive.org/details/Apple-1_Operation_Manual_1976_Apple_a)
- [6502 Instruction Set](http://www.6502.org/tutorials/6502opcodes.html)