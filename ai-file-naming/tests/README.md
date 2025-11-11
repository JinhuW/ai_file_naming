# Test Files

This directory contains test files for the AI File Naming SDK.

## Directory Structure

```
tests/
├── README.md           # This file
├── setup.ts           # Jest test setup and configuration
├── test-sdk.ts        # Main SDK integration tests
├── test-debug.ts      # Debug tests with detailed logging
├── test-simple.ts     # Simple quick tests
├── test-images.ts     # Image-specific tests
└── test-real-files.ts # Real-world file testing
```

## Test Types

### Unit Tests (Jest)
Automated unit tests run with Jest:

```bash
npm test                 # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # Generate coverage report
```

### Manual/Integration Tests
Manual test scripts for development and debugging:

```bash
npm run test:manual     # Run main SDK test

# Or run individual test files:
ts-node tests/test-sdk.ts
ts-node tests/test-debug.ts
ts-node tests/test-simple.ts
ts-node tests/test-images.ts
ts-node tests/test-real-files.ts
```

## Environment Setup

All tests require environment variables to be set:

```bash
# Copy example env file
cp .env.example .env

# Add your API keys
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
# etc...
```

## Test Descriptions

### `test-sdk.ts`
Main integration test covering:
- Provider connection testing
- Single file naming
- Batch file naming
- Error handling
- Metrics collection

### `test-debug.ts`
Detailed debugging with:
- Verbose logging enabled
- Event monitoring
- Step-by-step execution tracking
- Error analysis

### `test-simple.ts`
Quick smoke tests for:
- Basic functionality
- API connectivity
- Simple file naming

### `test-images.ts`
Image-specific tests:
- Image file analysis
- Vision model usage
- Batch image processing
- EXIF data extraction

### `test-real-files.ts`
Real-world scenarios:
- Processing actual file directories
- Mixed file types
- Large batch operations
- Performance testing

## Writing Tests

When adding new tests, follow these guidelines:

### Jest Unit Tests
```typescript
describe('FeatureName', () => {
  it('should do something specific', async () => {
    // Arrange
    const sdk = new FileNamingSDK(mockConfig);

    // Act
    const result = await sdk.nameFile('/path/to/file');

    // Assert
    expect(result.suggestedName).toBeDefined();
  });
});
```

### Manual Integration Tests
```typescript
import { FileNamingSDK } from '../src';
import * as dotenv from 'dotenv';

dotenv.config();

async function testFeature() {
  // Validate environment
  if (!process.env.OPENAI_API_KEY) {
    console.error('API key missing');
    process.exit(1);
  }

  // Run test
  const sdk = new FileNamingSDK({ /* config */ });
  const result = await sdk.nameFile('/path/to/file');

  console.log('Result:', result);
}

testFeature().catch(console.error);
```

## Best Practices

1. **Always check for API keys** before running tests that need them
2. **Use mock data** for unit tests to avoid API costs
3. **Clean up** test files and resources after tests
4. **Log meaningful information** to help debugging
5. **Handle errors gracefully** with proper try-catch blocks

## CI/CD

For continuous integration, only unit tests run automatically:
```bash
npm test
```

Manual/integration tests are for local development only and should not be run in CI without proper mocking.
