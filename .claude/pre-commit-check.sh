#!/bin/bash

# Pre-commit hook to prevent direct commits to master
# This script should be symlinked or copied to .git/hooks/pre-commit

BRANCH=$(git rev-parse --abbrev-ref HEAD)

if [ "$BRANCH" = "master" ] || [ "$BRANCH" = "main" ]; then
    echo "❌ ERROR: Direct commits to $BRANCH branch are not allowed!"
    echo ""
    echo "Please create a feature branch first:"
    echo "  git checkout -b feat/your-feature-name"
    echo ""
    echo "Branch naming conventions:"
    echo "  - feat/    (new features)"
    echo "  - fix/     (bug fixes)"
    echo "  - perf/    (performance improvements)"
    echo "  - docs/    (documentation)"
    echo "  - refactor/ (code refactoring)"
    echo "  - test/    (tests)"
    echo "  - chore/   (maintenance)"
    echo ""
    exit 1
fi

exit 0