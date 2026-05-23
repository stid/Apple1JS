# Parallel Agents & Git Worktrees

How to run multiple Claude Code sessions/agents on Apple1JS in parallel without
them stepping on each other's files. Requires Claude Code ≥ 2.1.

## TL;DR

```bash
# Spin up an isolated session on a fresh branch + worktree
claude --worktree feature-name      # named worktree -> branch worktree-feature-name
claude --worktree                   # auto-generated name
claude --worktree "#1234"           # check out from PR #1234
```

Each `--worktree` session gets its own directory under `.claude/worktrees/`
(gitignored) on its own branch, sharing the same repo history and remote. Edits
in one session never touch files in another.

## Why config "just works" in a worktree

A git worktree is a separate working directory, so it only contains **tracked**
files plus whatever we explicitly copy in:

- **Tracked, so automatically present:** `.claude/settings.json` (permissions +
  output style), `.mcp.json` (Context7), `.claude/agents/`, `.claude/commands/`,
  `.claude/skills/`, `CLAUDE.md`. Every worktree inherits these for free.
- **Gitignored, so copied via `.worktreeinclude`:** `.claude/settings.local.json`
  (machine-local grants + hook wiring), `.claude/hooks/` (the actual hook
  scripts), and `.env*`. The root `.worktreeinclude` lists these so Claude copies
  them into each new worktree — this is what keeps the auto-format /
  protect-generated hooks active in parallel sessions.

> Hook scripts stay gitignored on purpose (a fork PR must not be able to inject
> auto-executing code). `.worktreeinclude` copies the _maintainer's local_ hooks
> into the worktree without committing them.

## Cleanup

- No changes / no untracked files / no new commits → worktree auto-removed when
  the session ends.
- Has changes → Claude prompts to keep or remove.
- Non-interactive runs don't auto-clean; remove manually:

    ```bash
    git worktree list
    git worktree remove .claude/worktrees/<name>
    ```

## Subagent isolation

The `wasm-engine-verifier` subagent has `isolation: worktree` in its frontmatter,
so parity verification runs in its own temporary worktree and never collides with
concurrent edits in the main session. Add `isolation: worktree` to any subagent
that should run on an isolated copy of the repo.

## Practical limits

2–4 concurrent sessions is the sweet spot. Beyond that, review overhead and
rate-limit friction usually outweigh the parallelism gain.

## Optional: experimental Agent Teams

For complex, interdependent work where agents need to message each other (not
just report back to a lead), Claude Code has experimental Agent Teams:

```bash
CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 claude
```

Higher token cost than subagents (each teammate is a separate Claude instance);
best for research/review, debugging competing hypotheses, or cross-layer work.
Subagents + worktrees remain the cheaper default for file-isolated feature work.
