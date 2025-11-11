# Claude Code Configuration

This directory contains Claude Code specific configuration and hooks for the AI File Naming SDK project.

## 📁 Directory Structure

```
.claude/
├── claude.json          # Main Claude Code configuration
├── hooks/              # Automation hooks
│   ├── post-code.sh   # Runs after Claude finishes coding
│   ├── pre-commit.sh  # Quick checks before commits
│   └── README.md      # Hooks documentation
└── README.md          # This file
```

## 🎯 What's Configured

### Automatic Quality Checks

Every time Claude Code finishes coding, it automatically:
1. ✨ **Formats** code with Prettier
2. 🔍 **Lints** code with ESLint (auto-fixes issues)
3. 📋 **Type checks** with TypeScript
4. 🔨 **Builds** the project

This ensures all code changes meet quality standards before being shown to you.

## ⚙️ Configuration Files

### `claude.json`

Main configuration file for Claude Code:

```json
{
  "name": "AI File Naming SDK",
  "hooks": {
    "post-code": {
      "command": ".claude/hooks/post-code.sh",
      "enabled": true,
      "continueOnError": false
    }
  },
  "settings": {
    "typescript": { "enabled": true, "strict": true },
    "linting": { "enabled": true, "autoFix": true },
    "formatting": { "enabled": true, "tool": "prettier" }
  }
}
```

### `.claudeignore`

Tells Claude Code which files to ignore (similar to `.gitignore`):
- Build outputs (`dist/`, `node_modules/`)
- Temporary files
- Cache directories
- IDE settings

## 🔧 Available Hooks

### Post-Code Hook (`post-code.sh`) ✅ Enabled

**Triggers:** After Claude finishes coding
**Purpose:** Ensure code quality
**Actions:**
- Format with Prettier
- Lint with ESLint + auto-fix
- Type check with TypeScript
- Build project

**Configure:**
```json
{
  "hooks": {
    "post-code": {
      "enabled": true,           // Enable/disable
      "continueOnError": false   // Stop on errors?
    }
  }
}
```

### Pre-Commit Hook (`pre-commit.sh`) ⚠️ Manual

**Triggers:** Manually before commits
**Purpose:** Quick format check
**Usage:**
```bash
.claude/hooks/pre-commit.sh
```

## 🎨 Customization

### Disable Auto-Formatting

Edit `.claude/claude.json`:
```json
{
  "settings": {
    "formatting": {
      "enabled": false
    }
  }
}
```

### Change Hook Behavior

Edit `.claude/hooks/post-code.sh`:
```bash
# Comment out steps you don't need:
# echo -e "${YELLOW}🔨 Step 4/4: Building project...${NC}"
# npm run build
```

### Continue on Lint Errors

Edit `.claude/claude.json`:
```json
{
  "hooks": {
    "post-code": {
      "continueOnError": true
    }
  }
}
```

## 🚀 Quick Commands

### Test the Hook Manually
```bash
./.claude/hooks/post-code.sh
```

### Disable All Hooks Temporarily
```json
{
  "hooks": {
    "post-code": { "enabled": false }
  }
}
```

### View Hook Logs
```bash
cat /tmp/prettier.log
cat /tmp/eslint.log
cat /tmp/typecheck.log
cat /tmp/build.log
```

## 📊 Hook Output Example

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 Running post-code quality checks...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Step 1/4: Formatting code with Prettier...
✓ Code formatted successfully

🔍 Step 2/4: Linting and auto-fixing with ESLint...
✓ ESLint passed with auto-fixes applied

📋 Step 3/4: Type checking with TypeScript...
✓ Type checking passed

🔨 Step 4/4: Building project...
✓ Build successful

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ All quality checks passed! Code is ready.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 🐛 Troubleshooting

### Hook Not Running?

1. **Check if enabled:**
   ```bash
   cat .claude/claude.json | grep -A 2 "post-code"
   ```

2. **Check permissions:**
   ```bash
   ls -la .claude/hooks/post-code.sh
   # Should show: -rwxr-xr-x (executable)
   ```

3. **Fix permissions:**
   ```bash
   chmod +x .claude/hooks/post-code.sh
   ```

### Hook Fails?

1. **View detailed logs:**
   ```bash
   cat /tmp/eslint.log
   ```

2. **Run manually to debug:**
   ```bash
   bash -x .claude/hooks/post-code.sh
   ```

3. **Temporarily disable:**
   Set `"continueOnError": true` in `claude.json`

### Too Slow?

Comment out the build step in `post-code.sh`:
```bash
# echo -e "${YELLOW}🔨 Step 4/4: Building project...${NC}"
# npm run build
```

## 📚 Learn More

- **Hooks Documentation:** See `.claude/hooks/README.md`
- **Claude Code Docs:** https://docs.claude.com/claude-code
- **Project Contributing:** See `CONTRIBUTING.md`

## 💡 Tips

1. **Fast Iteration:** Disable build step during development
2. **Strict Mode:** Keep `continueOnError: false` for quality
3. **Custom Checks:** Add your own validation steps to hooks
4. **Git Integration:** Link hooks to git pre-commit

## 🎯 Best Practices

✅ **Do:**
- Keep hooks fast (< 30 seconds)
- Review hook output after Claude codes
- Customize for your workflow
- Test hooks manually before relying on them

❌ **Don't:**
- Disable type checking (catches bugs early)
- Skip formatting (keeps codebase consistent)
- Ignore hook failures (they indicate real issues)

---

**Questions?** Open an issue or check the documentation!
