# Full Check Command

Complete pre-commit validation including WASM build verification. Use this before PRs or major commits.

## Usage

- `/full-check` - Run complete validation suite

## Steps

Run all checks in sequence:

1. **Lint**: `yarn lint`
2. **Type Check**: `yarn type-check`
3. **Markdown Lint**: `yarn lint:md`
4. **WASM Build (Dev)**: `yarn wasm:build:dev` — use the yarn script, **not** raw
   `wasm-pack build --dev …`. The script also runs `node scripts/patch-wasm-bindings.js`;
   skipping it leaves the bindings unpatched and the WASM module can fail to load.
5. **Cargo Check**: `yarn wasm:check`
6. **Tests**: `yarn test:ci`
7. **Build Verification**: `yarn build` (ensures production build works)

## Additional Checks

- Verify no console.log statements in source (except LoggingService)
- Check for any TODO comments that should be addressed
- Verify version in `src/version.ts` is updated if making changes

## On Failure

Report:

- Which step failed
- Detailed error information
- Files that need attention

## On Success

Confirm:

- All quality gates passed
- WASM binary size
- Test coverage percentage
- Ready for commit/PR
