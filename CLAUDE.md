# CLAUDE.md - Dual-Engine CPU Migration Guide

> **Current Focus**: Building a runtime-switchable CPU core with TypeScript and Rust/WASM implementations
> **Key principle**: This is a personal hobby project for learning - keep it fun and exploratory!

## 🎯 WASM Migration Focus

### Current Priority: Dual-Engine System

We're building a **hot-swappable CPU engine system** that allows runtime switching between:

- **JS Engine**: Original TypeScript implementation (better debugging)
- **WASM Engine**: High-performance Rust implementation (5-10x faster)

### Critical Development Rules

1. **ALWAYS use Context7 MCP server** for WASM/Rust documentation
2. **Maintain feature parity** between both engines
3. **Test both engines** for every change
4. **Document performance differences**
5. **Keep JS engine as fallback**

## 🚀 Quick Start Checklist

**CRITICAL: Think hard about the task before starting!** This checklist ensures quality:

```bash
# 1. Check branch (NEVER work on master!)
git branch --show-current

# 2. If on master, create feature branch
git checkout -b <type>/<description>  # feat/, fix/, refactor/, docs/, test/, chore/

# 3. Run tests to verify starting state
yarn test:ci

# 4. Check current version
cat src/version.ts  # Current: 4.39.0

# 5. Build WASM engine (when it exists)
cd wasm-cpu && wasm-pack build --target web --out-dir ../src/wasm

# 6. ALWAYS use TodoWrite tool for multi-step tasks!
```

## 🔄 Engine Development Commands

```bash
# Build WASM module (from project root)
cd wasm-cpu && wasm-pack build --dev --target web --out-dir ../src/wasm

# Build optimized WASM (when ready)
cd wasm-cpu && cargo build --target wasm32-unknown-unknown --release

# Quick rebuild during development
cd wasm-cpu && cargo check

# Run engine-parity tests to verify both engines work
yarn test  # All tests include engine parity tests

# Check WASM toolchain
rustc --version  # Should be 1.70+ (we have 1.89.0)
wasm-pack --version  # Should be 0.12+ (we have 0.13.1)
cargo --version  # Should be recent (we have 1.89.0)
```

## 🔧 WASM Troubleshooting

Common issues and fixes:

- **wasm-opt fails**: Add `wasm-opt = false` to `[package.metadata.wasm-pack]` in Cargo.toml
- **Build from wrong directory**: Always `cd wasm-cpu` first
- **Missing target**: Run `rustup target add wasm32-unknown-unknown`
- **Type errors in generated code**: Rebuild with `--dev` flag for cleaner output

## 📊 Performance Tracking

Track these metrics when developing:

- **Instructions/second (IPS)** - Target: 1M+ for WASM
- **Engine switch time** - Target: <10ms
- **Memory usage** - WASM should use ~50% less
- **State transfer accuracy** - Must be 100%
- **WASM binary size** - Currently ~329KB (dev), target <100KB (release)

## 🎯 Essential Context

### What is Apple1JS?

- Browser-based Apple 1 emulator (TypeScript/React)
- Cycle-accurate 6502 CPU emulation
- **Dual-engine architecture** (JS + WASM)
- Worker-based architecture for performance
- Comprehensive debugging tools
- **Runtime engine switching** capability

### Project Philosophy

- Personal hobby project - no deadlines or sprints
- For learning and exploration (especially Rust/WASM!)
- Informal tone preferred
- "Ideas to explore" not "requirements"
- Performance matters but compatibility is critical

## 📍 Navigation Shortcuts

### Need to understand the system?

→ `docs/active/architecture.md`

### Looking for a specific component?

→ Check module structure in architecture.md

### Want to see what's in progress?

→ `docs/active/consolidated_roadmap.md`

### Looking for UX ideas and improvements?

→ `docs/active/user_experience_analysis.md`

### Need type definitions?

→ `src/core/types/` or `src/apple1/types/`

### Testing guidelines?

→ `docs/active/cpu_test_guidelines.md`

## 🔄 Recommended Workflow

### Explore → Plan → Code → Commit

**ALWAYS follow this workflow for best results:**

1. **EXPLORE** - Read relevant files thoroughly

   ```bash
   # Use architecture.md as your map
   # Search for similar patterns in codebase
   # Check existing tests for context
   ```

2. **PLAN** - Create detailed implementation plan
   - Use TodoWrite tool for tasks with 3+ steps
   - Break complex features into manageable chunks
   - Think through edge cases and test scenarios

3. **CODE** - Implement with existing patterns
   - Follow code style from neighboring files
   - Write tests alongside implementation
   - Use type safety (no `any` types!)

4. **COMMIT** - Verify and document changes

   ```bash
   yarn run lint && yarn run type-check && yarn run test:ci
   yarn run lint:md:fix  # For any markdown changes
   git add -A && git commit -m "type: description"
   ```

## 🛠️ Common Tasks

### Adding a Feature

1. Find related code using architecture.md as guide
2. Check if pattern exists (likely in similar components)
3. Write tests first if modifying core emulation
4. Use existing formatters/utilities

### Debugging Worker Issues

- Messages defined in `src/apple1/types/worker-messages.ts`
- Use `sendWorkerMessage()` for type safety
- Check browser DevTools for Worker messages

### Finding Where Something Lives

```text
src/
├── core/        # Emulation engine (CPU, Bus, Memory)
├── apple1/      # System integration, Worker
├── components/  # React UI components
├── services/    # Logging, Worker comm, State persistence
├── contexts/    # React state management
└── hooks/       # Reusable React patterns
```

## 🧪 Testing Strategy

**CRITICAL: ALL TESTS MUST PASS BEFORE COMMITTING!**

- Never break the test suite - if tests fail after your changes, fix them
- Always run `yarn test:ci` before committing any changes
- If adding new features, add corresponding tests
- If changing component behavior, update tests to match

### Test-Driven Development (TDD) Approach

**For core emulation changes, ALWAYS use TDD:**

1. **Write the test first**

   ```typescript
   // Example: Testing a new CPU instruction
   it('should handle new instruction correctly', () => {
     // Setup initial state
     // Execute instruction
     // Assert expected outcome
   });
   ```

2. **Verify test fails**

   ```bash
   yarn test --watch  # Run in watch mode for quick iteration
   ```

3. **Write minimal code to pass**
   - Implement just enough to make test green
   - Don't over-engineer on first pass

4. **Refactor and iterate**
   - Clean up implementation
   - Add edge case tests
   - Ensure all tests still pass

### Testing Commands

```bash
yarn test          # Run all tests
yarn test:watch    # Watch mode for TDD
yarn test:ci       # Full CI test suite
yarn test:coverage # Check test coverage
```

## 💻 Development Environment

### Essential Tools

```bash
# GitHub CLI for PR management and complex GitHub operations
brew install gh  # macOS
# or: sudo apt install gh  # Linux

# Authenticate once
gh auth login

# Visual debugging
# Use browser DevTools for:
# - Worker message inspection
# - Performance profiling
# - React component debugging
```

### GitHub CLI Operations

**The `gh` command is available for complex GitHub operations:**

```bash
# Pull Request Management
gh pr create --title "feat: description" --body "detailed description"
gh pr view 123                    # View PR details
gh pr checks 123                  # Check CI/CD status
gh pr comments 123               # View PR comments
gh pr merge 123                  # Merge PR when ready

# Issue Management  
gh issue create --title "bug: description"
gh issue view 456
gh issue list --state open

# Repository Operations
gh repo view                     # Repository info
gh api repos/owner/repo/pulls    # Direct API access
gh release create v1.0.0         # Create releases

# Security & Code Scanning
gh api repos/owner/repo/code-scanning/alerts  # CodeQL findings
gh api repos/owner/repo/security-advisories   # Security advisories
```

**Use Cases for AI Assistants:**

- Creating and managing pull requests programmatically
- Checking CI/CD pipeline status and failures
- Fetching CodeQL security findings for remediation
- Managing issues and project workflow
- Accessing GitHub API for complex repository operations

### Helpful Aliases

```bash
# Add to your shell config:
alias a1-lint="yarn run lint && yarn run type-check"
alias a1-test="yarn test:ci"
alias a1-check="a1-lint && a1-test"
```

## ✅ Before ANY Commit

1. **Run quality checks**:

    ```bash
    yarn run lint && yarn run type-check && yarn run test:ci
    ```

2. **Fix markdown documentation**:

    ```bash
    yarn run lint:md:fix  # Auto-fix markdown issues
    ```

3. **Update version** (MANDATORY before PR):

    ```bash
    # Edit src/version.ts
    # Patch: 4.33.33 → 4.33.34 (bug fixes)
    # Minor: 4.33.33 → 4.34.0 (new features)
    # Major: 4.33.33 → 5.0.0 (breaking changes)
    ```

4. **Commit with conventional format**:

    ```bash
    git add -A
    git commit -m "type: description"  # feat:, fix:, docs:, etc.
    ```

## 🔑 Key Patterns to Follow

### State Management

- Components implement `IVersionedStatefulComponent`
- Always include version and migration support
- See existing components for patterns

### Formatting

- Use `Formatters` utility (no manual toString(16))
- Consistent hex formatting: `Formatters.hexWord(addr)`

### Worker Communication

```typescript
// Type-safe messaging
sendWorkerMessage(worker, WORKER_MESSAGES.SET_BREAKPOINT, address);
```typescript

### Component Inspection

- Implement `IInspectableComponent` for debugger visibility
- Return structured data from `getInspectable()`

## 🚫 Common Pitfalls

1. **NEVER commit to master** - Always use feature branches (THIS IS CRITICAL!)
2. **Don't use console.log** - Use LoggingService
3. **Avoid any types** - TypeScript strict mode is enabled
4. **Don't hardcode colors** - Use design tokens (except CRT display)
5. **Remember version bump** - Required for every PR

## 📊 Project Roadmap

**See `docs/active/consolidated_roadmap.md` for the complete, prioritized roadmap.**

### Quick Summary of Priorities:

🛑 **Critical** - Test stability & core issues
🔴 **High** - Core functionality & architecture  
🟡 **Medium** - Enhanced features
🟢 **Low** - Refinements & polish

### Recently Completed ✅
- Jest to Vitest Migration (626 tests)
- Comlink Worker Migration (Phase 2)
- Type System Organization
- State Management Interfaces
- Formatter Migration (97 instances)
- CPU6502 Module Split (6 focused modules)
- Base Classes for Common Patterns (useWorkerState hooks)
- **Dual-Engine CPU System** with runtime switching (Aug 31, 2024)
- **Performance Metrics Dashboard** with real-time monitoring
- **WASM Engine Integration** with proper initialization
- **WASM Performance Optimization** - Release build now 90KB (was 357KB), achieving target performance

### Current Focus: WASM CPU Implementation 🚀

#### ✅ Major Milestone Completed!
- **150+ documented 6502 opcodes implemented** in Rust/WASM
- All major addressing modes (izx, izy, zpx, zpy, abx, aby)
- Complete instruction set: Load/Store, Arithmetic, Logical, Shift/Rotate, Compare, Branch
- BIT instruction with proper flag handling
- WASM module successfully building (387KB dev, target <100KB release)
- Dual-engine architecture ready for integration

#### ✅ Recently Completed (Aug 31, 2024)
- **Fixed 0 IPS metrics issue** - Clock now properly subscribes to DualEngine
- **Resolved WASM initialization errors** - Proper initialization sequencing
- **Engine switcher UI component** - Complete with real-time switching
- **Performance metrics dashboard** - Shows IPS, memory, and speedup
- **WASM Release Build Optimization** - Fixed performance regression (was 0.2x slower, now 5-10x faster)
- **Binary Size Optimization** - Reduced from 357KB (dev) to 90KB (release)

#### ✅ Recently Completed (Oct 4, 2025)
- **Project Cleanup** - Removed ~1,700 lines of experimental code
  - Removed WasmEnhancedEngine (experimental internal memory approach)
  - Removed WASM proxy files (RAM/ROM/Bus proxies)
  - Removed Jest configuration (fully migrated to Vitest)
  - Untracked 291MB of WASM build artifacts from git
  - Cleaned up unused Rust modules (cpu_enhanced, memory_bridge, memory)

#### 🎯 Current Architecture Status
**Working Dual-Engine System** - DualEngine coordinates JS and WASM engines:
- **JSEngine**: Wraps existing CPU6502 (TypeScript implementation)
- **WasmEngine**: Wraps WASM CPU using JavaScript memory bridge
- **DualEngine**: Provides runtime switching with state preservation
- **Memory**: Single source of truth in JavaScript (RAM.ts, ROM.ts, Bus.ts)

#### 📋 Next Priority Tasks
1. **Performance optimization** - Profile and optimize hot paths
2. **Enhanced debugging** - Add WASM-specific debugging support
3. **Documentation** - Update architecture docs with cleanup changes

#### 🎯 Using the Dual-Engine System

```typescript
// Create dual-engine CPU
import { DualEngine } from './src/core/cpu-engines';

const dualEngine = new DualEngine(bus, 'JS'); // Start with JS engine
await dualEngine.initialize();

// Switch to WASM for performance
await dualEngine.switchEngine('WASM');

// Get performance comparison
const comparison = await dualEngine.compareEngines();
console.log(`WASM is ${comparison.speedup}x faster!`);

// Listen for engine switches
dualEngine.onEngineSwitch(event => {
    console.log(`Switched from ${event.from} to ${event.to}`);
});
```

#### 📁 WASM Project Structure

```text
wasm-cpu/               # Rust source (build from here)
├── Cargo.toml
└── src/
    ├── lib.rs         # Entry point & exports
    ├── cpu.rs         # 6502 CPU implementation
    ├── ram.rs         # WASM RAM module
    ├── rom.rs         # WASM ROM module
    ├── bus.rs         # WASM Bus module
    ├── instructions.rs # 6502 instruction implementations
    └── opcodes.rs     # Opcode dispatch table

src/core/cpu-engines/  # TypeScript engine wrappers
├── JSEngine.ts        # Wraps existing CPU6502
├── WasmEngine.ts      # Wraps WASM CPU (uses JS memory)
├── DualEngine.ts      # Coordinates both engines with runtime switching
├── wasm-loader.ts     # WASM initialization & status
├── wasm-memory-bridge.ts # JS memory bridge for WASM
└── index.ts           # Public exports

src/wasm/              # Generated WASM output (gitignored)
├── apple1_cpu_wasm.js # JS bindings (generated by wasm-pack)
├── apple1_cpu_wasm.d.ts # TypeScript definitions
└── apple1_cpu_wasm_bg.wasm # WASM binary
```

For detailed task breakdowns, timelines, and execution strategy, refer to the consolidated roadmap.

## 🎨 Visual References

### When Working on UI Components

**IMPORTANT**: For UI changes, provide screenshots or mockups to iterate against!

1. **Before starting UI work**, ask for:
   - Screenshots of current state
   - Visual mockups or sketches
   - Specific success criteria

2. **During implementation**:
   - Take screenshots of progress
   - Compare against references
   - Iterate 2-3 times for polish

3. **Example request format**:

   ```text
   "Here's a screenshot of the current memory viewer.
   I want to add highlighting for changed values.
   Success: Changed bytes show in yellow for 1 second."
   ```

## 🔗 Quick References

### Documentation

- **Documentation Hub**: `docs/README.md`
- **Architecture**: `docs/active/architecture.md`
- **Roadmap & Priorities**: `docs/active/consolidated_roadmap.md`
- **Standardization Progress**: `docs/active/standardization-progress.md`
- **Test Guidelines**: `docs/active/cpu_test_guidelines.md`

### External Resources

- [6502 Opcodes](http://www.6502.org/tutorials/6502opcodes.html)
- [Apple-1 Manual](https://archive.org/details/Apple-1_Operation_Manual_1976_Apple_a)

---

💡 **Remember**: This is a learning project. If something seems interesting to explore, let's do it! Keep suggestions informal and frame them as opportunities to learn rather than requirements.

## 🚨 Success Criteria

### How to Know You're Done

**ALWAYS verify these before considering a task complete:**

1. ✅ All tests pass (`yarn test:ci`)
2. ✅ No lint errors (`yarn lint`)
3. ✅ No type errors (`yarn type-check`)
4. ✅ Version bumped in `src/version.ts`
5. ✅ Feature works as described
6. ✅ No console.log statements left
7. ✅ Documentation updated if needed

### Using Verification

For complex changes, consider the following approaches:

- Running the app and manually testing
- Taking screenshots of working features
- Writing integration tests for new workflows

## 📝 Markdown Documentation Rule

**IMPORTANT**: After creating or editing any markdown files, always run:

```bash
yarn run lint:md:fix
```

This automatically fixes most formatting issues and ensures consistent documentation.
