# Quick Start Guide

Get started with the AI File Naming SDK in 5 minutes!

## Installation

```bash
# Create a new project
mkdir my-file-namer
cd my-file-namer
npm init -y

# Install the SDK
npm install /path/to/ai-file-naming

# Install OpenAI SDK (or your preferred provider)
npm install openai
```

## Setup Environment

Create a `.env` file:

```env
OPENAI_API_KEY=your-api-key-here
```

## Basic Usage

Create `index.ts`:

```typescript
import { FileNamingSDK } from 'ai-file-naming';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  // Initialize SDK
  const sdk = new FileNamingSDK({
    provider: {
      type: 'openai',
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4o',
    },
    naming: {
      format: 'snake_case',
    },
  });

  // Name a file
  const result = await sdk.nameFile('./my-vacation-photo.jpg');
  console.log(`Suggested name: ${result.suggestedName}`);

  // Batch process
  const batch = await sdk.nameBatch('./photos/*.jpg');
  console.log(`Processed: ${batch.totalSuccess} files`);
}

main().catch(console.error);
```

## Run

```bash
npx ts-node index.ts
```

## Examples in This Repository

```bash
cd ai-file-naming

# 1. Basic usage
npx ts-node examples/basic-usage.ts

# 2. All providers demo
npx ts-node examples/all-providers.ts

# 3. Custom provider
npx ts-node examples/custom-provider.ts

# 4. Event handling
npx ts-node examples/event-handling.ts
```

## Provider Setup

### OpenAI
```bash
npm install openai
export OPENAI_API_KEY=sk-...
```

### Anthropic Claude
```bash
npm install @anthropic-ai/sdk
export ANTHROPIC_API_KEY=sk-ant-...
```

### Google Gemini
```bash
npm install @google/generative-ai
export GEMINI_API_KEY=...
```

### Ollama (Local - No API Key)
```bash
# Install Ollama: https://ollama.ai
ollama pull llava
ollama serve
```

## Common Use Cases

### 1. Organize Photos
```typescript
const sdk = new FileNamingSDK({
  provider: { type: 'openai', apiKey: process.env.OPENAI_API_KEY! },
});

await sdk.nameBatch('./photos', {
  prompt: 'Name photos based on what you see',
  caseFormat: 'kebab-case',
});
```

### 2. Rename Documents
```typescript
await sdk.nameFile('./report.pdf', {
  prompt: 'Create a professional filename for this business document',
  includeDate: true,
});
```

### 3. Process Videos
```typescript
// Requires ffmpeg installed
await sdk.nameFile('./video.mp4', {
  prompt: 'Name based on video content',
});
```

### 4. Monitor Progress
```typescript
sdk.on('batch:progress', (event) => {
  console.log(`${event.processed}/${event.total} complete`);
});
```

## Next Steps

- Read the full [README.md](./README.md)
- Check [FEATURES.md](./FEATURES.md) for comparison
- See [PROJECT_STATUS.md](./PROJECT_STATUS.md) for technical details
- Review [examples/](./examples/) directory

## Troubleshooting

### "Provider not initialized"
- Check that you installed the provider SDK (e.g., `npm install openai`)
- Verify your API key is correct

### "ffmpeg not found"
- Install ffmpeg for video processing:
  ```bash
  # macOS
  brew install ffmpeg

  # Ubuntu
  sudo apt-get install ffmpeg

  # Windows
  choco install ffmpeg
  ```

### "Rate limit exceeded"
- Reduce batch concurrency
- Add delays between requests
- Use caching to reduce API calls

## Support

For issues or questions:
1. Check the documentation
2. Review the examples
3. Open an issue on GitHub

---

**Happy file naming! 🎉**