# AI File Naming SDK - Examples

This directory contains example implementations demonstrating various features of the AI File Naming SDK.

## Prerequisites

Before running the examples, make sure you have:

1. Installed dependencies:
   ```bash
   npm install
   ```

2. Set up your environment variables in `.env`:
   ```bash
   cp .env.example .env
   # Edit .env and add your API keys
   ```

## Available Examples

### 1. Basic Usage (`basic-usage.ts`)
Demonstrates the core functionality of the SDK:
- Initializing the SDK with OpenAI provider
- Naming a single file
- Batch naming multiple files
- Renaming files with dry-run mode
- Viewing provider metrics and cache statistics

**Run:**
```bash
ts-node examples/basic-usage.ts
```

### 2. All Providers (`all-providers.ts`)
Shows how to use different AI providers:
- OpenAI (GPT-4)
- Anthropic (Claude)
- Ollama (local models)
- Google Gemini

**Run:**
```bash
ts-node examples/all-providers.ts
```

### 3. Event Handling (`event-handling.ts`)
Demonstrates the event-driven architecture:
- Listening to naming events
- Batch progress tracking
- Error handling
- Custom event handlers

**Run:**
```bash
ts-node examples/event-handling.ts
```

### 4. Custom Provider (`custom-provider.ts`)
Shows how to create and register a custom AI provider:
- Extending the AIProvider base class
- Implementing required methods
- Registering with ProviderRegistry
- Using your custom provider

**Run:**
```bash
ts-node examples/custom-provider.ts
```

## Configuration

Each example can be configured by modifying the initialization parameters:

```typescript
const sdk = new FileNamingSDK({
  provider: {
    type: 'openai',           // Provider type
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o',          // Model to use
    temperature: 0.7,          // Creativity (0-1)
  },
  naming: {
    format: 'snake_case',      // File naming format
    maxLength: 80,             // Max filename length
    sanitize: true,            // Remove special characters
  },
  logging: {
    level: 'info',             // Log level: debug, info, warn, error
    format: 'pretty',          // Log format: pretty or json
  },
});
```

## Common Issues

### API Key Not Found
```
Error: OPENAI_API_KEY environment variable is not set
```
**Solution:** Create a `.env` file with your API key

### Provider Package Not Installed
```
OpenAI package not installed. Install it with: npm install openai
```
**Solution:** Install the required provider package

### Rate Limiting
If you hit rate limits, consider:
- Reducing `concurrency` in batch operations
- Adding delays between requests
- Using a different pricing tier

## Need Help?

- Check the main [README.md](../README.md) for detailed documentation
- View the [API documentation](../docs/)
- Report issues on [GitHub](https://github.com/your-repo/issues)
