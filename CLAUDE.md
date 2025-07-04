# CLAUDE.md

## 🧠 Project Overview

Apple1JS is a TypeScript/React-based Apple 1 computer emulator. It includes a full 6502 CPU emulation, memory management, PIA 6820 I/O, and a CRT-style display.

---

## 🧠 Claude Instructions

**Phase 1 – Analysis & Proposal**

- Analyze and document findings in:
    - `@docs/architecture_analysis.md` for code/architecture improvements
    - `@docs/user_experience_analysis.md` for UX/UI enhancements
- List tasks with effort estimates (S/M/L) and implementation phases
- **MANDATORY: Wait for explicit "✅ Phase 1 Approved" before ANY coding begins.**

**Phase 2 – Implementation**

- After approval, implement changes per plan.
- **MANDATORY: Run test coverage analysis before and after changes**
- **MANDATORY: Update `src/version.ts` with semantic versioning ONLY after all tasks complete**
- **MANDATORY: Run full CI pipeline (lint, type-check, test:ci) before version bump**
- Mark completed items with ✅ in the respective analysis document

**Phase 2 Completion Checklist:**

- [ ] All planned changes implemented
- [ ] Test coverage maintained or improved
- [ ] No console.log usage (use UI logging system)
- [ ] CI pipeline passes (yarn run lint && yarn run type-check && yarn run test:ci)
- [ ] Version updated with appropriate semantic bump
- [ ] Analysis document updated with ✅ markers

**General Guidelines**

- Follow architectural patterns above.
- Prefer minimal, non-breaking changes.
- Use `IInspectableComponent` for new core components.
- Avoid `console.log`; use the UI-based logging system.
- Ask for clarification when unsure.
- Never alter code inside src/progs unless explicitly instructed to do so. This is original Apple 1 code and should not be modified. You may analyze it as needed to inform your thinking and validate any code changes.

---

## 🛠 Development Commands

Refer to `@README.md` for full descriptions. Key scripts include:

- `yarn run dev` / `build` / `preview` – Core development
- `yarn run test` / `test:ci` / `pretest` – Testing & CI
- `yarn run lint` / `lint:fix` / `type-check` / `format` – Code quality

---

## 🧱 Architecture Overview

- **src/core/**: 6502 CPU, memory (RAM/ROM), clock, bus, PIA emulation
- **src/apple1/**: System orchestration, I/O logic, Web Worker, built-in programs
- **src/components/**: React UI (CRT display, debugger, inspector)
- **src/core/@types/**: TypeScript interfaces for emulation and inspection
- **src/services/**: Services like UI Logging

---

## 🧩 Key Architectural Patterns

- **Component Inspection**: Implements `IInspectableComponent` for debugger integration.
- **State Management**: Serializable `EmulatorState`; Web Worker separates UI/emulation.
- **Memory Mapping**:
    - `$0000–$0FFF`: RAM
    - `$E000–$EFFF`: Extended RAM (BASIC)
    - `$D010–$D013`: PIA (I/O)
    - `$FF00–$FFFF`: ROM (WOZ Monitor)
- **I/O Abstraction**: Keyboard and display via `IoComponent` interfaces.
- **Performance**: Use performance tests for core logic changes.
- **Open Source**: No sensitive info; clarity over cleverness unless performance demands it.

---

## 🚀 Continuous Integration

Before merging, ensure:

- `yarn run lint`
- `yarn run type-check`
- `yarn run test:ci`

Refer to `.github/workflows/ci.yml` for CI configuration.

---

## 🧪 Testing Strategy

- Unit tests for core emulation (CPU, Bus, RAM, PIA)
- Integration tests for Web Worker and UI
- Canvas mocking for CRT display
- TypeScript strict mode enforced
- Preserve existing tests; update only for new requirements
- Avoid mocking unless strictly required
- All new features must include tests and TypeScript types
- Cover legacy features with tests before refactoring

---

## 📊 Test Coverage Expectations

- ≥ 90% line and branch coverage for core logic
- UI components tested for rendering and interaction
- Emulation logic includes regression tests for Apple 1 programs

---

## 🔢 Version Bump Guidelines

| Change Type     | Bump Level | Example                                  |
| --------------- | ---------- | ---------------------------------------- |
| Breaking change | Major      | Removed or changed public API signatures |
| New feature     | Minor      | Added illegal-opcode tracing in CPU6502  |
| Bugfix          | Patch      | Fixed off-by-one in memory map logic     |

---

## 📝 Commit Message Template

```markdown
<type>(<scope>): <short description>

Body:

- What changed
- Why it changed
- How to test

Footer (if needed):

- BREAKING CHANGE: <description>
- Closes #<issue>
```

---

## 🖥️ UI Logging System

See `@docs/ui_logging_summary.md` for the UI-based logging system overview.

---

## 🖥️ Woz Monitor

See `@docs/woz_monitor_cheatsheet.md` for Woz monitor overview.

---

## 📚 Glossary

- PIA: Peripheral Interface Adapter (6820), handles I/O
- CRT: Cathode Ray Tube-style display rendered in browser
- WOZ Monitor: Built-in Apple 1 ROM monitor program
- IInspectableComponent: Interface for debugger integration
- EmulatorState: Serializable object representing emulator state

## 🔗 Reference Materials

- [Apple-1 Operation Manual (1976)](https://archive.org/details/Apple-1_Operation_Manual_1976_Apple_a)
- [Apple-1 Manual PDF (Asimov Archive)](https://mirrors.apple2.org.za/ftp.apple.asimov.net/documentation/apple1/apple1manual_alt.pdf)
