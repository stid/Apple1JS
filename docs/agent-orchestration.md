# Agent Orchestration Guide

This guide explains how to use the multi-agent orchestration system for Apple1JS development with Claude.

## Quick Start

The simplest way to run all agents:

```bash
./agents.sh
```

## Available Methods

### 1. Shell Script (`agents.sh`)

The main orchestration script with different modes:

```bash
./agents.sh           # Run all agents sequentially
./agents.sh review    # Run only architecture review
./agents.sh fix       # Run only lint/type/test fixes
./agents.sh test      # Run only test generation
./agents.sh docs      # Run only documentation update
./agents.sh commit    # Run only version update & commit
./agents.sh pr        # Create a pull request
./agents.sh quick     # Quick single-command mode
```

### 2. NPM Scripts

Run agents through npm/yarn:

```bash
npm run agents              # Run all agents sequentially
npm run agents:quick        # Quick fix & commit mode
npm run agent:review        # Architecture review only
npm run agent:fix           # Fix issues only
npm run agent:test          # Generate tests only
npm run agent:docs          # Update docs only
npm run agent:commit        # Update version & commit only
```

### 3. Makefile (Parallel Execution)

Run agents in parallel for faster execution:

```bash
make -f Makefile.agents agents-parallel    # Run review, test, docs in parallel
make -f Makefile.agents agents-sequential  # Run all sequentially
make -f Makefile.agents help               # Show all available targets
```

### 4. Node.js Orchestrator

More control with the Node.js script:

```bash
node scripts/run-agents.js          # Run all agents
node scripts/run-agents.js parallel # Run some in parallel
node scripts/run-agents.js review   # Run specific agent
```

### 5. VS Code Tasks

Use Command Palette (`Cmd+Shift+P`) → "Tasks: Run Task":

- Run All Agents
- Agent: Architecture Review
- Agent: Fix Issues
- Agent: Generate Tests
- Agent: Update Docs
- Agent: Commit Changes
- Agent: Quick Fix & Commit
- Agents: Run in Parallel

## Git Aliases (Optional)

Add these to your `~/.gitconfig`:

```ini
[alias]
    agents = "!npm run agents"
    agent-fix = "!./agents.sh fix"
    agent-commit = "!./agents.sh commit"
    agent-review = "!./agents.sh review"
    agent-quick = "!./agents.sh quick"
```

Then use:

```bash
git agents        # Run full pipeline
git agent-quick   # Quick fix and commit
```

## Workflow Examples

### Before Creating a PR

```bash
# Full pipeline
./agents.sh all

# Or quicker version
./agents.sh quick
```

### After Making Changes

```bash
# Review your changes
./agents.sh review

# Fix any issues
./agents.sh fix

# When ready to commit
./agents.sh commit
```

### Parallel Development

```bash
# Use Makefile for parallel execution
make -f Makefile.agents agents-parallel
```

## How It Works

Each agent is a Claude invocation with a specific prompt:

1. **Review Agent**: Checks code against architecture.md and CLAUDE.md
2. **Fix Agent**: Runs lint, type-check, and tests, fixing issues
3. **Test Agent**: Generates tests for uncovered code
4. **Docs Agent**: Updates documentation based on changes
5. **Commit Agent**: Updates version.ts and creates conventional commit
6. **PR Agent**: Pushes branch and creates pull request

## Tips

- Always ensure you're on a feature branch (not master)
- The scripts will warn you if you're on master
- Agents work best with focused, single-purpose changes
- Use `quick` mode for simple fixes
- Use full pipeline for feature development

## Requirements

- Claude CLI must be installed and available in PATH
- Node.js for the orchestrator script
- Make for parallel execution support
- Git for version control operations
