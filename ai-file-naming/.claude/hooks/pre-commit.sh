#!/bin/bash
# Pre-commit hook for Claude Code (optional)
# Runs a quick check before committing changes

set -e

echo "🔍 Running pre-commit checks..."
echo ""

# Quick lint check (no fix, just check)
echo "📝 Checking code style..."
if npm run format:check > /dev/null 2>&1; then
    echo "✓ Code formatting is correct"
else
    echo "⚠️  Code needs formatting. Running auto-format..."
    npm run format
fi

echo ""
echo "✓ Pre-commit checks passed"
exit 0
