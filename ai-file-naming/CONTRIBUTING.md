# Contributing to AI File Naming SDK

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Code Style](#code-style)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Adding New Providers](#adding-new-providers)

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- TypeScript knowledge
- Git

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-file-naming
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env and add your API keys for testing
   ```

4. **Run the build**
   ```bash
   npm run build
   ```

5. **Run tests**
   ```bash
   npm test
   ```

## Project Structure

```
ai-file-naming/
├── src/                    # Source code
│   ├── core/              # Core SDK classes
│   │   ├── FileNamingSDK.ts
│   │   └── ConfigManager.ts
│   ├── providers/         # AI provider implementations
│   │   ├── base/         # Base provider class
│   │   ├── openai/       # OpenAI provider
│   │   ├── anthropic/    # Anthropic provider
│   │   ├── ollama/       # Ollama provider
│   │   ├── gemini/       # Gemini provider
│   │   ├── ProviderRegistry.ts
│   │   └── index.ts
│   ├── utils/            # Utility functions
│   │   ├── Logger.ts
│   │   ├── FileUtils.ts
│   │   ├── CaseTransformer.ts
│   │   └── VideoUtils.ts
│   ├── types/            # TypeScript type definitions
│   │   ├── config.ts
│   │   ├── provider.ts
│   │   ├── naming.ts
│   │   ├── file.ts
│   │   ├── events.ts
│   │   ├── ai-clients.ts
│   │   └── index.ts
│   ├── events/           # Event system
│   │   └── EventEmitter.ts
│   └── index.ts          # Main entry point
├── tests/                # Test files
│   ├── setup.ts         # Jest setup
│   └── test-*.ts        # Test scripts
├── examples/             # Usage examples
│   └── *.ts             # Example files
├── docs/                 # Documentation
│   ├── CHANGELOG.md
│   ├── FEATURES.md
│   ├── PROJECT_STATUS.md
│   └── SUMMARY.md
└── package.json
```

## Code Style

This project follows the **Google TypeScript Style Guide** with strict TypeScript configuration.

### TypeScript Rules

- ✅ Use strict mode (`strict: true`)
- ✅ No implicit `any` types
- ✅ Explicit return types for exported functions
- ✅ Use interfaces over type aliases when possible
- ✅ Follow naming conventions:
  - PascalCase for classes and interfaces
  - camelCase for variables and functions
  - UPPER_CASE for constants

### File Organization

- **Imports Order:**
  1. Node.js built-in modules
  2. External dependencies
  3. Internal absolute imports
  4. Internal relative imports

```typescript
// Good
import * as path from 'path';
import { z } from 'zod';
import { Logger } from '../utils/Logger';
import { FileContext } from './types';
```

### Code Formatting

```bash
# Format code
npm run format

# Check formatting
npm run format:check

# Lint code
npm run lint

# Fix lint issues
npm run lint:fix
```

### Documentation

- Add JSDoc comments for all public APIs
- Include `@param` and `@returns` tags
- Document complex logic with inline comments

```typescript
/**
 * Generate a name for a single file
 * @param filePath - Path to the file to name
 * @param options - Optional naming configuration
 * @returns Promise resolving to naming response
 */
async nameFile(filePath: string, options?: NamingOptions): Promise<NamingResponse> {
  // Implementation
}
```

## Testing

### Unit Tests

Write unit tests for all new functionality:

```typescript
describe('FeatureName', () => {
  it('should handle basic case', () => {
    // Test implementation
  });

  it('should handle edge cases', () => {
    // Test implementation
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run manual/integration tests
npm run test:manual
```

### Test Coverage

- Aim for >80% code coverage
- Test both success and error paths
- Include edge cases

## Submitting Changes

### Commit Messages

Follow conventional commits format:

```
type(scope): subject

body

footer
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes

**Examples:**
```
feat(providers): add Gemini provider support

- Implement GeminiProvider class
- Add configuration schema
- Update provider registry
- Add usage examples

Closes #123
```

### Pull Request Process

1. **Fork the repository**

2. **Create a feature branch**
   ```bash
   git checkout -b feat/my-new-feature
   ```

3. **Make your changes**
   - Write code
   - Add tests
   - Update documentation

4. **Ensure quality**
   ```bash
   npm run lint
   npm run typecheck
   npm test
   npm run build
   ```

5. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat(scope): description"
   ```

6. **Push to your fork**
   ```bash
   git push origin feat/my-new-feature
   ```

7. **Create a Pull Request**
   - Provide clear description
   - Reference related issues
   - Add screenshots if applicable

### PR Guidelines

- Keep PRs focused and atomic
- Update tests for any code changes
- Update documentation if needed
- Ensure CI passes
- Respond to review feedback promptly

## Adding New Providers

To add a new AI provider:

### 1. Create Provider Class

```typescript
// src/providers/newprovider/NewProvider.ts
import { AIProvider } from '../base/AIProvider';
import { ProviderCapabilities } from '../../types/provider';

export class NewProvider extends AIProvider {
  readonly name = 'newprovider';

  readonly capabilities: ProviderCapabilities = {
    supportsVision: true,
    supportsStreaming: false,
    // ... other capabilities
  };

  protected initializeClient(): unknown {
    // Initialize provider SDK
  }

  protected async executeRequest(context): Promise<ProviderResponse> {
    // Implement request logic
  }

  protected async performConnectionTest(): Promise<boolean> {
    // Test connection
  }

  protected requiresApiKey(): boolean {
    return true;
  }

  protected isValidModel(model: string): boolean {
    // Validate model names
  }
}
```

### 2. Add Configuration

```typescript
// src/types/config.ts
export const NewProviderConfigSchema = BaseProviderConfigSchema.extend({
  type: z.literal('newprovider'),
  apiKey: z.string(),
  // ... provider-specific config
});

export type NewProviderConfig = z.infer<typeof NewProviderConfigSchema>;
```

### 3. Register Provider

```typescript
// src/providers/index.ts
import { NewProvider } from './newprovider/NewProvider';

ProviderRegistry.register('newprovider', NewProvider, {
  description: 'Description of new provider',
  version: '1.0.0',
});
```

### 4. Add Tests

```typescript
// tests/providers/newprovider.test.ts
describe('NewProvider', () => {
  it('should initialize correctly', () => {
    // Test implementation
  });
});
```

### 5. Add Example

```typescript
// examples/newprovider-usage.ts
const sdk = new FileNamingSDK({
  provider: {
    type: 'newprovider',
    apiKey: process.env.NEWPROVIDER_API_KEY,
    // ... config
  },
});
```

### 6. Update Documentation

- Add to README.md
- Update FEATURES.md
- Add provider-specific docs

## Questions?

- Open an issue for bugs or feature requests
- Join our community discussions
- Check existing issues and PRs

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
