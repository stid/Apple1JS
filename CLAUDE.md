# CLAUDE.md - AI Assistant Guide

> This guide helps AI assistants quickly understand the project and make effective contributions.
> **Key principle**: This is a personal hobby project for learning - keep it fun and exploratory!

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
cat src/version.ts  # Current: 4.21.0

# 5. ALWAYS use TodoWrite tool for multi-step tasks!
```

## 🎯 Essential Context

### What is Apple1JS?

- Browser-based Apple 1 emulator (TypeScript/React)
- Cycle-accurate 6502 CPU emulation
- Worker-based architecture for performance
- Comprehensive debugging tools

### Project Philosophy

- Personal hobby project - no deadlines or sprints
- For learning and exploration
- Informal tone preferred
- "Ideas to explore" not "requirements"

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
    # Patch: 4.21.0 → 4.21.1 (bug fixes)
    # Minor: 4.21.0 → 4.22.0 (new features)
    # Major: 4.21.0 → 5.0.0 (breaking changes)
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
- Jest to Vitest Migration (601 tests)
- Comlink Worker Migration (Phase 2)
- Type System Organization
- State Management Interfaces
- Formatter Migration (97 instances)

### Current Focus Areas:
1. **Stabilization** - Fix type workarounds, race conditions
2. **Architecture** - Split large modules, create reusable patterns
3. **Features** - Memory search, conditional breakpoints, watch expressions

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
