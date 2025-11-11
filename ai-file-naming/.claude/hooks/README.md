# Claude Code Hooks

This directory contains hooks that automatically run at various points during Claude Code's workflow.

## Available Hooks

### `post-code.sh` 🔧

Automatically runs after Claude finishes coding to ensure code quality.

**What it does:**
1. ✨ **Formats code** with Prettier
2. 🔍 **Lints code** with ESLint (auto-fixes issues)
3. 📋 **Type checks** with TypeScript
4. 🔨 **Builds project** to ensure compilation

**Configuration:**
- Enabled by default in `.claude/claude.json`
- Set `continueOnError: false` to stop on failures
- Set `enabled: false` to disable the hook

### How Hooks Work

Claude Code hooks are shell scripts that run at specific points:

```
User Request → Claude Codes → post-code hook runs → Result shown
```

### Hook Lifecycle

```
┌─────────────────┐
│ Claude Codes    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ post-code.sh    │
├─────────────────┤
│ 1. Format       │
│ 2. Lint + Fix   │
│ 3. Type Check   │
│ 4. Build        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Report Results  │
└─────────────────┘
```

## Customizing Hooks

### Modify Existing Hook

Edit the hook file directly:
```bash
nano .claude/hooks/post-code.sh
```

### Add New Hook

1. Create new script:
   ```bash
   touch .claude/hooks/my-hook.sh
   chmod +x .claude/hooks/my-hook.sh
   ```

2. Add to `claude.json`:
   ```json
   {
     "hooks": {
       "my-hook": {
         "command": ".claude/hooks/my-hook.sh",
         "description": "My custom hook",
         "enabled": true
       }
     }
   }
   ```

### Disable a Hook

Set `enabled: false` in `claude.json`:
```json
{
  "hooks": {
    "post-code": {
      "enabled": false
    }
  }
}
```

## Hook Environment

Hooks run with these environment variables:
- `PWD` - Project root directory
- `CLAUDE_CODE_VERSION` - Claude Code version
- `HOOK_NAME` - Name of the current hook

## Debugging Hooks

If a hook fails:

1. **Check logs:**
   ```bash
   cat /tmp/prettier.log
   cat /tmp/eslint.log
   cat /tmp/typecheck.log
   cat /tmp/build.log
   ```

2. **Run manually:**
   ```bash
   ./.claude/hooks/post-code.sh
   ```

3. **Check permissions:**
   ```bash
   ls -la .claude/hooks/
   ```

## Best Practices

### ✅ Do:
- Keep hooks fast (< 30 seconds)
- Provide clear error messages
- Use color coding for output
- Exit with proper codes (0 = success, 1 = failure)
- Log detailed errors to temp files

### ❌ Don't:
- Make destructive changes without confirmation
- Run hooks that require user input
- Ignore errors silently
- Make hooks too complex

## Common Hook Patterns

### Basic Hook Structure

```bash
#!/bin/bash
set -e  # Exit on error

echo "🔧 Running my hook..."

# Do work
if some_command; then
    echo "✓ Success"
else
    echo "✗ Failed"
    exit 1
fi

exit 0
```

### Conditional Execution

```bash
# Only run on TypeScript files
if [ -n "$(git diff --name-only | grep '.ts$')" ]; then
    npm run typecheck
fi
```

### Parallel Execution

```bash
# Run multiple checks in parallel
(npm run lint:fix > /tmp/lint.log 2>&1) &
(npm run typecheck > /tmp/type.log 2>&1) &
wait
```

## Hook Examples

### Pre-commit Hook (manual)

Create a git hook:
```bash
#!/bin/bash
# .git/hooks/pre-commit
.claude/hooks/post-code.sh
```

### CI/CD Integration

Use in GitHub Actions:
```yaml
- name: Run quality checks
  run: ./.claude/hooks/post-code.sh
```

## Troubleshooting

### Hook not running?
1. Check if enabled in `claude.json`
2. Verify file permissions (`chmod +x`)
3. Check Claude Code settings

### Hook running too slow?
1. Skip build step if not needed
2. Run lint without fix first
3. Use `--cache` flags where available

### Hook blocking work?
Set `continueOnError: true` in `claude.json` to continue even on failures.

## Support

- Claude Code Documentation: https://docs.claude.com/claude-code
- Report issues: https://github.com/your-repo/issues
- Hook ideas: Create an issue with the `enhancement` label
