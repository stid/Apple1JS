# Git Workflow for Claude

## MANDATORY Git Workflow - ALWAYS Follow These Steps

### Before Making ANY Changes:

1. **Check Current Branch**
   ```bash
   git branch --show-current
   ```

2. **If on master/main, CREATE A FEATURE BRANCH**
   ```bash
   git checkout -b <type>/<description>
   # Examples:
   # feat/add-new-component
   # fix/memory-leak
   # perf/reduce-overhead
   # docs/update-readme
   ```

### When Making Changes:

3. **Make Changes and Stage**
   ```bash
   git add <files>
   # or
   git add -A  # for all changes
   ```

4. **Commit with Descriptive Message**
   ```bash
   git commit -m "<type>: <description>"
   ```

5. **Update Version (if needed)**
   - Always update src/version.ts before creating PR
   - Patch: bug fixes (4.12.1 → 4.12.2)
   - Minor: new features (4.12.0 → 4.13.0)
   - Major: breaking changes (4.0.0 → 5.0.0)

### Creating Pull Request:

6. **Push Feature Branch**
   ```bash
   git push -u origin <branch-name>
   ```

7. **Create PR**
   ```bash
   gh pr create --title "<type>: <description>" --body "..."
   ```

## Branch Naming Convention

- `feat/` - New features
- `fix/` - Bug fixes
- `perf/` - Performance improvements
- `docs/` - Documentation only
- `refactor/` - Code refactoring
- `test/` - Test additions/changes
- `chore/` - Maintenance tasks

## Commit Message Format

```
<type>: <subject>

<body>

<footer>
```

Types: feat, fix, perf, docs, refactor, test, chore

## CRITICAL RULES

1. **NEVER commit directly to master/main**
2. **ALWAYS create a feature branch first**
3. **ALWAYS update version.ts before PR**
4. **ALWAYS run tests before pushing**
5. **ALWAYS create a PR for review**

## Pre-Push Checklist

- [ ] On feature branch (not master)?
- [ ] All tests passing?
- [ ] Version updated?
- [ ] Commit message follows format?
- [ ] Ready to create PR?