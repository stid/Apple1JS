#!/bin/bash
# agents.sh - Simple agent orchestrator for Apple1JS

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to run an agent task
run_agent() {
    local agent_name=$1
    local prompt=$2
    echo -e "\n${BLUE}=== Running ${agent_name} Agent ===${NC}"
    claude "$prompt"
    echo -e "${GREEN}✓ ${agent_name} Agent completed${NC}"
}

# Check if we're on master branch
current_branch=$(git branch --show-current)
if [ "$current_branch" = "master" ]; then
    echo -e "${YELLOW}Warning: You're on master branch. Creating feature branch...${NC}"
    echo "Please specify branch name (e.g., feat/add-feature): "
    read branch_name
    git checkout -b "$branch_name"
fi

# Main orchestration based on argument
case "${1:-all}" in
    "review")
        run_agent "Architecture Review" "Review the recent changes against architecture.md and CLAUDE.md guidelines. Check for pattern violations and suggest improvements."
        ;;
    
    "test")
        run_agent "Test Generation" "Look at recent changes with 'git diff' and generate tests for any untested code. Follow the patterns in docs/active/cpu_test_guidelines.md"
        ;;
    
    "fix")
        run_agent "Pre-commit Fix" "Run 'yarn lint && yarn type-check && yarn test:ci' and fix any issues found. Do not commit changes."
        ;;
    
    "commit")
        run_agent "Version & Commit" "Check git diff, update src/version.ts appropriately (patch/minor/major), then create a commit with conventional format. Do not push."
        ;;
    
    "docs")
        run_agent "Documentation Update" "Check if recent code changes require updates to documentation. Update architecture.md if structure changed."
        ;;
    
    "pr")
        run_agent "PR Creation" "Push the current branch and create a pull request with a clear description of changes"
        ;;
    
    "quick")
        # Quick mode - single command for common workflow
        run_agent "Quick Fix & Commit" "Run yarn lint && yarn type-check && yarn test:ci, fix any issues, update version.ts, and prepare a conventional commit message"
        ;;
    
    "all"|*)
        # Full pipeline
        echo -e "${BLUE}Running full agent pipeline...${NC}"
        run_agent "Architecture Review" "Review the recent changes against architecture.md and CLAUDE.md guidelines"
        run_agent "Pre-commit Checks" "Run yarn lint && yarn type-check && yarn test:ci and fix any issues"
        run_agent "Test Generation" "Generate tests for any untested code in the recent changes"
        run_agent "Documentation Update" "Update docs if needed based on code changes"
        run_agent "Version & Commit" "Update version.ts based on changes and commit with conventional format"
        echo -e "\n${GREEN}✓ All agents completed!${NC}"
        echo -e "${YELLOW}Run './agents.sh pr' to create a pull request${NC}"
        ;;
esac