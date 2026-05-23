# Quick Check Command

Run fast quality checks before committing. This is a lightweight verification that catches most issues quickly.

## Usage

- `/quick-check` - Run lint, type-check, and tests

## Steps

Run these commands in sequence, stopping on first failure:

1. **Lint**: `yarn lint`
    - Checks ESLint rules for TypeScript/React
    - Reports any style or code quality issues

2. **Type Check**: `yarn type-check`
    - Runs TypeScript compiler in check mode
    - Catches type errors without building

3. **Tests**: `yarn test:ci`
    - Runs `run-s pretest vitest:ci` — `pretest` re-runs lint + type-check, then
      `vitest:ci` runs `vitest run` (no coverage; use `yarn test:coverage` for that)
    - Because `pretest` repeats steps 1–2, treat those as a fast fail-early preview
      rather than separate gates

## On Failure

Report:

- Which step failed
- Specific file(s) and line number(s) with issues
- Suggested fixes if obvious

## On Success

Confirm all checks passed and code is ready to commit.
