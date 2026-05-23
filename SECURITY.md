# Security Policy

Apple1JS is a browser-based Apple 1 emulator. It runs entirely client-side and handles no
user accounts or sensitive data, but it does ship developer tooling (see below) where the
threat model matters.

## Reporting a vulnerability

Please report security issues **privately**, not via a public issue:

- Preferred: open a draft advisory under the repository's **Security → Advisories →
  Report a vulnerability** tab on GitHub.
- Alternatively, email the maintainer at <stid72@gmail.com>.

Include reproduction steps and impact. As a solo hobby project there is no formal SLA, but
reports are taken seriously and acknowledged when received.

## `.claude/` tooling review policy

The [`.claude/`](.claude/) directory contains [Claude Code](https://claude.com/claude-code)
tooling (a subagent, slash commands, skills, and reference hook scripts). This is a **public
repo accepting PRs**, and Claude Code tooling can execute code on a maintainer's machine, so
contributions touching it get extra scrutiny:

- **Any PR that adds or modifies files under `.claude/` — especially hook scripts or any
  `settings*.json` — must be reviewed line-by-line before the branch is checked out.**
  Unlike `.github/workflows`, Claude Code tooling has no fork-PR approval gate; a hook wired
  in a local settings file runs automatically the moment a maintainer edits a file.
- **No `settings.json` is committed**, and `.claude/hooks/` is gitignored, specifically so a
  PR cannot introduce an auto-executing hook at a path a maintainer's local config wires.
  Maintainers must never wire fork-PR-supplied hook scripts into their `settings.local.json`.
- Reference hook scripts live in `.claude/hooks.example/` and are **inert** — nothing
  executes them unless a contributor deliberately copies and wires them.

See [`.claude/README.md`](.claude/README.md) for the full tooling layout and opt-in steps.
