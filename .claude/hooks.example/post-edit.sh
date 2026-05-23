#!/bin/bash
# Post-edit hook: auto-format and validate changes
# Exit 2 = BLOCK (report error to Claude)
# Exit 0 = SUCCESS

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.filePath // empty')
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# If we couldn't extract a file path, skip
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Get file extension
EXT="${FILE_PATH##*.}"

cd "$PROJECT_DIR" || exit 0

case "$EXT" in
  ts|tsx)
    # Run ESLint fix on TypeScript files
    if command -v yarn &> /dev/null && [ -f "package.json" ]; then
      # Only lint the specific file that was edited
      yarn eslint --fix "$FILE_PATH" 2>&1
      LINT_EXIT=$?
      if [ $LINT_EXIT -ne 0 ]; then
        echo "ESLint found issues in $FILE_PATH" >&2
        exit 2
      fi
    fi
    ;;

  rs)
    # Run cargo check for Rust files
    if echo "$FILE_PATH" | grep -q "wasm-cpu"; then
      cd "$PROJECT_DIR/wasm-cpu" || exit 0
      cargo check 2>&1
      CARGO_EXIT=$?
      if [ $CARGO_EXIT -ne 0 ]; then
        echo "Cargo check failed for Rust changes" >&2
        exit 2
      fi
    fi
    ;;

  md)
    # Run markdown lint fix
    if command -v yarn &> /dev/null && [ -f "package.json" ]; then
      yarn lint:md:fix "$FILE_PATH" 2>/dev/null || true
    fi
    ;;
esac

exit 0
