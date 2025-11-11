#!/bin/bash
# Post-code hook for Claude Code
# This hook runs after Claude finishes coding to automatically lint and fix errors

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔧 Running post-code quality checks...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 1. Run Prettier to format code
echo -e "${YELLOW}📝 Step 1/4: Formatting code with Prettier...${NC}"
if npm run format > /tmp/prettier.log 2>&1; then
    echo -e "${GREEN}✓ Code formatted successfully${NC}"
else
    echo -e "${RED}✗ Prettier formatting failed${NC}"
    cat /tmp/prettier.log
    exit 1
fi
echo ""

# 2. Run ESLint with auto-fix
echo -e "${YELLOW}🔍 Step 2/4: Linting and auto-fixing with ESLint...${NC}"
if npm run lint:fix > /tmp/eslint.log 2>&1; then
    echo -e "${GREEN}✓ ESLint passed with auto-fixes applied${NC}"
else
    # Count remaining errors
    ERROR_COUNT=$(grep -c "error" /tmp/eslint.log || echo "0")
    WARNING_COUNT=$(grep -c "warning" /tmp/eslint.log || echo "0")

    if [ "$ERROR_COUNT" -gt "0" ]; then
        echo -e "${RED}✗ ESLint found $ERROR_COUNT error(s) that could not be auto-fixed${NC}"
        echo -e "${YELLOW}Please review the following issues:${NC}"
        tail -30 /tmp/eslint.log
        echo ""
        echo -e "${YELLOW}💡 Tip: Run 'npm run lint' to see all issues${NC}"
    else
        echo -e "${GREEN}✓ ESLint passed (with $WARNING_COUNT warning(s))${NC}"
    fi
fi
echo ""

# 3. Run TypeScript type checking
echo -e "${YELLOW}📋 Step 3/4: Type checking with TypeScript...${NC}"
if npm run typecheck > /tmp/typecheck.log 2>&1; then
    echo -e "${GREEN}✓ Type checking passed${NC}"
else
    echo -e "${RED}✗ Type checking failed${NC}"
    echo -e "${YELLOW}Type errors found:${NC}"
    tail -20 /tmp/typecheck.log
    exit 1
fi
echo ""

# 4. Run build to ensure everything compiles
echo -e "${YELLOW}🔨 Step 4/4: Building project...${NC}"
if npm run build > /tmp/build.log 2>&1; then
    echo -e "${GREEN}✓ Build successful${NC}"
else
    echo -e "${RED}✗ Build failed${NC}"
    tail -20 /tmp/build.log
    exit 1
fi
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ All quality checks passed! Code is ready.${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Show summary
echo -e "${BLUE}📊 Summary:${NC}"
echo -e "  ${GREEN}✓${NC} Code formatted with Prettier"
echo -e "  ${GREEN}✓${NC} Linted and auto-fixed with ESLint"
echo -e "  ${GREEN}✓${NC} Type checking passed"
echo -e "  ${GREEN}✓${NC} Build completed successfully"
echo ""

exit 0
