# CLAUDE.md - AI Assistant Guide

> This guide helps AI assistants quickly understand the project and make effective contributions.
> **Key principle**: This is a personal hobby project for learning - keep it fun and exploratory!

## 🚀 Quick Start Checklist

```bash
# 1. Check branch (NEVER work on master!)
git branch --show-current

# 2. If on master, create feature branch
git checkout -b <type>/<description>  # feat/, fix/, refactor/, docs/, test/, chore/

# 3. Run tests to verify starting state
yarn test:ci

# 4. Check current version
cat src/version.ts  # Current: 4.21.0
```

## 🎯 Essential Context

**What is Apple1JS?**
- Browser-based Apple 1 emulator (TypeScript/React)
- Cycle-accurate 6502 CPU emulation
- Worker-based architecture for performance
- Comprehensive debugging tools

**Project Philosophy**
- Personal hobby project - no deadlines or sprints
- For learning and exploration
- Informal tone preferred
- "Ideas to explore" not "requirements"

## 📍 Navigation Shortcuts

**Need to understand the system?**
→ `docs/active/architecture.md`

**Looking for a specific component?**
→ Check module structure in architecture.md

**Want to see what's in progress?**
→ `docs/active/user_experience_analysis.md`

**Need type definitions?**
→ `src/core/types/` or `src/apple1/types/`

**Testing guidelines?**
→ `docs/active/cpu_test_guidelines.md`

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
```
src/
├── core/        # Emulation engine (CPU, Bus, Memory)
├── apple1/      # System integration, Worker
├── components/  # React UI components
├── services/    # Logging, Worker comm, State persistence
├── contexts/    # React state management
└── hooks/       # Reusable React patterns
```

## ✅ Before ANY Commit

1. **Run quality checks**:
   ```bash
   yarn run lint && yarn run type-check && yarn run test:ci
   ```

2. **Update version** (MANDATORY before PR):
   ```bash
   # Edit src/version.ts
   # Patch: 4.21.0 → 4.21.1 (bug fixes)
   # Minor: 4.21.0 → 4.22.0 (new features)
   # Major: 4.21.0 → 5.0.0 (breaking changes)
   ```

3. **Commit with conventional format**:
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
```

### Component Inspection
- Implement `IInspectableComponent` for debugger visibility
- Return structured data from `getInspectable()`

## 🚫 Common Pitfalls

1. **Never commit to master** - Always use feature branches
2. **Don't use console.log** - Use LoggingService
3. **Avoid any types** - TypeScript strict mode is enabled
4. **Don't hardcode colors** - Use design tokens (except CRT display)
5. **Remember version bump** - Required for every PR

## 📊 Current Focus Areas

From `docs/active/user_experience_analysis.md`:
- Execution control (step/breakpoints)
- Memory search functionality
- Watch expressions
- Hardware authenticity features

## 🔗 Quick References

**Documentation Hub**: `docs/README.md`
**Architecture**: `docs/active/architecture.md`
**Current Work**: `docs/active/standardization-progress.md`
**Test Guidelines**: `docs/active/cpu_test_guidelines.md`

**External**:
- [6502 Opcodes](http://www.6502.org/tutorials/6502opcodes.html)
- [Apple-1 Manual](https://archive.org/details/Apple-1_Operation_Manual_1976_Apple_a)

---

💡 **Remember**: This is a learning project. If something seems interesting to explore, let's do it! Keep suggestions informal and frame them as opportunities to learn rather than requirements.