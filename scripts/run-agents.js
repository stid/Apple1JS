#!/usr/bin/env node

/**
 * run-agents.js - Node.js orchestrator for Claude Code agents
 * 
 * Usage:
 *   node scripts/run-agents.js [mode]
 * 
 * Modes:
 *   - all (default): Run all agents in sequence
 *   - review: Run only architecture review
 *   - fix: Run only lint/type/test fixes
 *   - test: Run only test generation
 *   - commit: Run only version update and commit
 *   - parallel: Run review, test, and docs in parallel
 */

const { execSync, spawn } = require('child_process');
const path = require('path');

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    red: '\x1b[31m'
};

// Agent definitions
const agents = {
    review: {
        name: 'Architecture Review',
        prompt: 'Review the recent changes against architecture.md and CLAUDE.md guidelines. Check for pattern violations and suggest improvements.',
        emoji: '🔍'
    },
    fix: {
        name: 'Pre-commit Fix',
        prompt: 'Run "yarn lint && yarn type-check && yarn test:ci" and fix any issues found. Do not commit changes.',
        emoji: '🔧'
    },
    test: {
        name: 'Test Generation',
        prompt: 'Look at recent changes with "git diff" and generate tests for any untested code. Follow the patterns in docs/active/cpu_test_guidelines.md',
        emoji: '🧪'
    },
    docs: {
        name: 'Documentation Update',
        prompt: 'Check if recent code changes require updates to documentation. Update architecture.md if structure changed.',
        emoji: '📚'
    },
    commit: {
        name: 'Version & Commit',
        prompt: 'Check git diff, update src/version.ts appropriately (patch/minor/major), then create a commit with conventional format. Do not push.',
        emoji: '📝'
    },
    pr: {
        name: 'PR Creation',
        prompt: 'Push the current branch and create a pull request with a clear description of changes',
        emoji: '🚀'
    }
};

// Run a single agent
function runAgent(agentKey) {
    const agent = agents[agentKey];
    if (!agent) {
        console.error(`${colors.red}Unknown agent: ${agentKey}${colors.reset}`);
        return Promise.reject(new Error(`Unknown agent: ${agentKey}`));
    }

    console.log(`\n${colors.blue}${agent.emoji} Running ${agent.name} Agent...${colors.reset}`);
    
    return new Promise((resolve, reject) => {
        try {
            execSync(`claude "${agent.prompt}"`, { 
                stdio: 'inherit',
                cwd: path.resolve(__dirname, '..')
            });
            console.log(`${colors.green}✓ ${agent.name} Agent completed${colors.reset}`);
            resolve();
        } catch (error) {
            console.error(`${colors.red}✗ ${agent.name} Agent failed${colors.reset}`);
            reject(error);
        }
    });
}

// Run agents in parallel
async function runParallel(agentKeys) {
    console.log(`\n${colors.blue}🚀 Running agents in parallel...${colors.reset}`);
    const promises = agentKeys.map(key => runAgent(key));
    await Promise.all(promises);
}

// Check if on master branch
function checkBranch() {
    try {
        const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
        if (branch === 'master' || branch === 'main') {
            console.log(`${colors.yellow}⚠️  Warning: You're on ${branch} branch!${colors.reset}`);
            console.log('Please create a feature branch first:');
            console.log('  git checkout -b feat/your-feature-name');
            process.exit(1);
        }
    } catch (error) {
        console.error('Could not determine current git branch');
    }
}

// Main execution
async function main() {
    const mode = process.argv[2] || 'all';
    
    // Always check branch first
    checkBranch();
    
    console.log(`${colors.bright}Apple1JS Agent Orchestrator${colors.reset}`);
    console.log(`Mode: ${mode}\n`);
    
    try {
        switch (mode) {
            case 'review':
                await runAgent('review');
                break;
                
            case 'fix':
                await runAgent('fix');
                break;
                
            case 'test':
                await runAgent('test');
                break;
                
            case 'docs':
                await runAgent('docs');
                break;
                
            case 'commit':
                await runAgent('commit');
                break;
                
            case 'pr':
                await runAgent('pr');
                break;
                
            case 'parallel':
                await runParallel(['review', 'test', 'docs']);
                await runAgent('fix');
                await runAgent('commit');
                break;
                
            case 'all':
            default:
                // Sequential execution
                await runAgent('review');
                await runAgent('fix');
                await runAgent('test');
                await runAgent('docs');
                await runAgent('commit');
                console.log(`\n${colors.green}✅ All agents completed!${colors.reset}`);
                console.log(`${colors.yellow}Run 'node scripts/run-agents.js pr' to create a pull request${colors.reset}`);
                break;
        }
    } catch (error) {
        console.error(`\n${colors.red}Agent pipeline failed!${colors.reset}`);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { runAgent, runParallel };