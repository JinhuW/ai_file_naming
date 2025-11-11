# AI File Naming SDK

An intelligent file naming SDK for Node.js that uses AI to generate descriptive, organized filenames based on file content, metadata, and context.

## Features

- **4 AI Providers Built-in**: OpenAI (GPT-4o), Anthropic (Claude 3), Google (Gemini), Ollama (local)
- **Vision Support**: Analyze images and videos to generate context-aware filenames
- **Video Processing**: Extract frames from videos using ffmpeg for AI analysis
- **Smart File Analysis**: Automatic detection and analysis of images, videos, documents, and more
- **Batch Processing**: Efficiently process multiple files with concurrency control
- **Customizable Naming**: Multiple naming strategies and case formats
- **Event-Driven**: Full event system for monitoring progress and handling errors
- **Caching**: Built-in caching to reduce API calls and improve performance
- **Extensible**: Easy to add custom AI providers
- **Local-First Option**: Use Ollama for privacy-focused, offline processing
- **TypeScript First**: Full type safety and IntelliSense support

## Installation

```bash
npm install ai-file-naming

# Install the AI provider SDK you want to use (peer dependencies)
npm install openai                    # For OpenAI GPT-4o
npm install @anthropic-ai/sdk         # For Claude 3
npm install @google/generative-ai     # For Gemini
npm install ollama                     # For local Ollama models

# For video processing (optional)
# Install ffmpeg on your system:
# macOS: brew install ffmpeg
# Ubuntu: sudo apt-get install ffmpeg
# Windows: choco install ffmpeg
```

## Quick Start

```typescript
import { FileNamingSDK } from 'ai-file-naming';

// Initialize the SDK
const sdk = new FileNamingSDK({
  provider: {
    type: 'openai',
    apiKey: 'your-api-key',
    model: 'gpt-4-vision-preview',
  },
  naming: {
    format: 'snake_case',
    maxLength: 80,
  },
});

// Name a single file
const result = await sdk.nameFile('/path/to/image.jpg');
console.log(result.suggestedName); // "sunset_beach_vacation_2024"

// Batch process multiple files
const batchResult = await sdk.nameBatch('/path/to/folder', {
  concurrency: 5,
  continueOnError: true,
});
```

## Configuration

### Provider Configuration

```typescript
// OpenAI
const sdk = new FileNamingSDK({
  provider: {
    type: 'openai',
    apiKey: 'your-api-key',
    model: 'gpt-4o', // or 'gpt-4o-mini'
    temperature: 0.7,
  },
});

// Anthropic Claude
const sdk = new FileNamingSDK({
  provider: {
    type: 'anthropic',
    apiKey: 'your-api-key',
    model: 'claude-3-opus-20240229',
  },
});

// Google Gemini
const sdk = new FileNamingSDK({
  provider: {
    type: 'gemini',
    apiKey: 'your-api-key',
    model: 'gemini-pro-vision',
  },
});

// Ollama (Local - no API key needed)
const sdk = new FileNamingSDK({
  provider: {
    type: 'ollama',
    model: 'llava', // or 'llama2', 'mistral', etc.
    baseURL: 'http://localhost:11434',
  },
});
```

### Naming Options

```typescript
const sdk = new FileNamingSDK({
  naming: {
    format: 'snake_case',      // 'snake_case' | 'kebab-case' | 'camelCase' | 'PascalCase'
    maxLength: 100,
    sanitize: true,
    replaceSpaces: '_',
    removeSpecialChars: true,
  },
});
```

### Batch Processing

```typescript
const sdk = new FileNamingSDK({
  batch: {
    concurrency: 5,
    chunkSize: 10,
    retryFailedItems: true,
  },
});
```

## API Reference

### `nameFile(filePath, options?)`

Generate a name for a single file.

```typescript
const result = await sdk.nameFile('/path/to/file.pdf', {
  prompt: 'Generate a descriptive name for this document',
  caseFormat: 'kebab-case',
  includeDate: true,
});
```

### `nameBatch(files, options?)`

Process multiple files in batch.

```typescript
const result = await sdk.nameBatch([
  '/path/to/file1.jpg',
  '/path/to/file2.pdf',
], {
  concurrency: 3,
  continueOnError: true,
});
```

### `renameFile(filePath, options?)`

Generate a new name and optionally rename the file.

```typescript
const result = await sdk.renameFile('/path/to/file.jpg', {
  dryRun: false,  // Set to true to preview without renaming
  overwrite: false,
});
```

## Events

The SDK emits various events for monitoring and debugging:

```typescript
sdk.on('naming:start', (event) => {
  console.log(`Processing: ${event.request.filePath}`);
});

sdk.on('naming:complete', (event) => {
  console.log(`Completed in ${event.duration}ms`);
});

sdk.on('batch:progress', (event) => {
  console.log(`Progress: ${event.processed}/${event.total}`);
});

sdk.on('provider:error', (event) => {
  console.error(`Provider error: ${event.error.message}`);
});
```

## Supported File Types

- **Images**: JPG, PNG, GIF, WebP, SVG, HEIC
- **Videos**: MP4, AVI, MKV, MOV, WebM
- **Documents**: PDF, DOCX, TXT, MD, RTF
- **Audio**: MP3, WAV, FLAC, AAC, OGG
- **Code**: JS, TS, PY, JAVA, GO, etc.
- **Archives**: ZIP, RAR, TAR, 7Z

## Custom Providers

You can easily add custom AI providers:

```typescript
import { AIProvider, ProviderRegistry } from 'ai-file-naming';

class CustomProvider extends AIProvider {
  // Implement required methods
}

ProviderRegistry.register('custom', CustomProvider);
```

## Examples

See the `/examples` directory for more usage examples:

- `basic-usage.ts` - Simple file naming examples
- `all-providers.ts` - Demonstration of all 4 AI providers
- `custom-provider.ts` - Creating a custom AI provider
- `event-handling.ts` - Working with events and monitoring

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run examples
npm run example:basic
```

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit PRs to our GitHub repository.