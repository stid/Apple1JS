# Claude Code tooling for Apple1JS

This directory holds **optional** [Claude Code](https://claude.com/claude-code) tooling for
working on Apple1JS — a subagent, slash commands, and skills tuned for the dual-engine
(JS + Rust/WASM) 6502 CPU. None of it is required to build, test, or contribute to the
project; it just makes Claude Code sessions faster and more accurate if you use that tool.

If you don't use Claude Code, you can ignore this directory entirely.

## What's here

| Path                             | Type              | What it does                                                                                                          | How it runs                                        |
| -------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `agents/wasm-engine-verifier.md` | Subagent          | Verifies JS ↔ WASM 6502 engine parity (registers, flags, cycles, memory bridge).                                     | Invoke-only — Claude delegates to it when asked.   |
| `commands/*.md`                  | Slash commands    | Playbooks: `/benchmark`, `/debug-cpu`, `/engine-test`, `/full-check`, `/perf-compare`, `/quick-check`, `/wasm-build`. | Invoke-only — run by typing the command.           |
| `skills/engine-parity-check.md`  | Skill             | Guidance for keeping both engines behaviorally identical when changing instructions.                                  | Invoke-only.                                       |
| `skills/wasm-optimization.md`    | Skill             | Speed-first WASM build/optimization guidance (`opt-level = 3`, ~155 KB).                                              | Invoke-only.                                       |
| `git-workflow.md`                | Doc               | The branch / commit / PR conventions this repo expects.                                                               | Reference.                                         |
| `pre-commit-check.sh`            | Git hook (opt-in) | Blocks direct commits to `master`/`main`.                                                                             | Only if you symlink it in — see below.             |
| `hooks.example/*.sh`             | Reference scripts | Auto-format-on-edit + protect-generated hooks. **Inert** here.                                                        | Only if you copy + wire them yourself — see below. |

Claude Code auto-discovers `agents/`, `commands/`, and `skills/` — they need no setup and
only ever run when you explicitly invoke them. They were reviewed to ensure they only drive
standard `yarn`/`cargo`/`wasm-pack` lint/build/test operations.

## Security posture (please read before adding tooling)

This is a **public repo accepting PRs**, so the tooling is split deliberately:

- **No `settings.json` is committed.** Claude Code hooks execute automatically on matching
  tool calls — but only when a `settings.json` wires them. Committing a settings file that
  wires hooks would mean every maintainer who checks out a branch and uses Claude Code runs
  whatever those hook scripts contain. A malicious fork PR could weaponize that. So hook
  wiring lives only in each contributor's **untracked** `.claude/settings.local.json`.
- **`.claude/hooks/` is gitignored.** The maintainer's local `settings.local.json` wires
  `.claude/hooks/*.sh` by path; keeping that directory out of git means a PR can't introduce
  or alter a file at the exact path that auto-executes. The scripts you'd want are published
  as **inert reference copies** in `hooks.example/` (nothing wires that path).
- **`settings.local.json` must never be committed.** It holds personal permission grants
  (including `rm`, `git push`, `git commit`) and is machine-local.

Any PR that touches `.claude/` — especially hooks or any `settings*.json` — must be reviewed
line-by-line before checkout. See [`/SECURITY.md`](../SECURITY.md).

## Opt-in: auto-format-on-edit hooks

`hooks.example/` contains two hooks Claude Code can run on every file edit:

- `post-edit.sh` — runs `eslint --fix` on `.ts/.tsx`, `cargo check` on `wasm-cpu` Rust
  changes, and `markdownlint --fix` on `.md`.
- `protect-generated.sh` — blocks edits to generated `src/wasm/*` files.

Both require [`jq`](https://jqlang.github.io/jq/). To enable them in your own checkout:

```bash
mkdir -p .claude/hooks
cp .claude/hooks.example/*.sh .claude/hooks/
chmod +x .claude/hooks/*.sh
```

Then add this to your own `.claude/settings.local.json` (create it if missing — it's
gitignored and stays on your machine only):

```json
{
    "hooks": {
        "PreToolUse": [
            {
                "matcher": "Edit|Write",
                "hooks": [
                    {
                        "type": "command",
                        "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/protect-generated.sh",
                        "timeout": 5
                    }
                ]
            }
        ],
        "PostToolUse": [
            {
                "matcher": "Edit|Write",
                "hooks": [
                    {
                        "type": "command",
                        "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/post-edit.sh",
                        "timeout": 60
                    }
                ]
            }
        ]
    }
}
```

## Opt-in: block commits to `master`/`main`

`pre-commit-check.sh` is a plain git hook (it runs only on `git commit`, never during a
Claude session). To enable it:

```bash
ln -s ../../.claude/pre-commit-check.sh .git/hooks/pre-commit
```
