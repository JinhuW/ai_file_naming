# Architecture Overview

This document provides a comprehensive overview of the AI File Naming SDK architecture.

## Table of Contents

- [High-Level Architecture](#high-level-architecture)
- [Core Components](#core-components)
- [Provider System](#provider-system)
- [Event System](#event-system)
- [Type System](#type-system)
- [Data Flow](#data-flow)

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      FileNamingSDK                          │
│  (Main API - Entry Point)                                   │
└────────────┬────────────────────────────────────────────────┘
             │
    ┌────────┴──────────┐
    │                   │
┌───▼──────────┐   ┌───▼─────────────┐
│ConfigManager │   │ProviderRegistry │
│              │   │                 │
└──────────────┘   └────┬────────────┘
                        │
         ┌──────────────┼──────────────┐
         │              │              │
    ┌────▼────┐    ┌───▼────┐    ┌───▼──────┐
    │ OpenAI  │    │Anthropic│   │  Ollama  │
    │Provider │    │Provider │   │Provider  │
    └─────────┘    └─────────┘   └──────────┘
         │              │              │
         └──────────────┼──────────────┘
                        │
                  ┌─────▼──────┐
                  │AIProvider  │
                  │(Base Class)│
                  └────────────┘
```

## Core Components

### FileNamingSDK

**Location:** `src/core/FileNamingSDK.ts`

Main SDK class that provides the public API.

**Responsibilities:**
- Initialize and manage providers
- Handle file naming requests
- Manage batch operations
- Emit events
- Cache results
- Coordinate between components

**Key Methods:**
- `nameFile()` - Name a single file
- `nameBatch()` - Name multiple files
- `renameFile()` - Generate name and rename
- `clearCache()` - Clear cached results
- `updateConfig()` - Update configuration

### ConfigManager

**Location:** `src/core/ConfigManager.ts`

Manages SDK configuration with validation.

**Responsibilities:**
- Load/save configuration
- Validate configuration with Zod
- Handle environment variables
- Emit config update events
- Provide config access methods

**Key Methods:**
- `updateConfig()` - Update configuration
- `validateConfig()` - Validate configuration
- `loadConfig()` - Load from file
- `saveConfig()` - Save to file
- `loadFromEnv()` - Load from environment

## Provider System

### Architecture

```
┌──────────────────────────────────────┐
│      ProviderRegistry                │
│  (Singleton - Provider Factory)      │
└───────────┬──────────────────────────┘
            │
            │ creates
            ▼
┌──────────────────────────────────────┐
│         AIProvider                   │
│  (Abstract Base Class)               │
├──────────────────────────────────────┤
│ + name: string                       │
│ + capabilities: ProviderCapabilities │
│ + generateName()                     │
│ + validateConfig()                   │
│ + testConnection()                   │
└───────────┬──────────────────────────┘
            │
    ┌───────┴────────┬─────────────┐
    │                │             │
┌───▼────────┐  ┌───▼────────┐  ┌─▼──────────┐
│OpenAI      │  │Anthropic   │  │Ollama      │
│Provider    │  │Provider    │  │Provider    │
└────────────┘  └────────────┘  └────────────┘
```

### AIProvider (Base Class)

**Location:** `src/providers/base/AIProvider.ts`

Abstract base class for all providers.

**Abstract Methods (must implement):**
- `initializeClient()` - Initialize provider SDK
- `executeRequest()` - Execute naming request
- `performConnectionTest()` - Test connection
- `requiresApiKey()` - Check if API key required
- `isValidModel()` - Validate model name

**Provided Methods:**
- `generateName()` - Generate name (uses executeRequest)
- `generateBatchNames()` - Generate multiple names
- `validateConfig()` - Validate configuration
- `getStatus()` - Get provider status
- `getMetrics()` - Get provider metrics
- `handleError()` - Error handling

### ProviderRegistry

**Location:** `src/providers/ProviderRegistry.ts`

Singleton registry for managing providers.

**Methods:**
- `register()` - Register a provider class
- `unregister()` - Remove a provider
- `create()` - Create provider instance
- `getOrCreate()` - Get cached or create new
- `getAvailable()` - List available providers
- `validate()` - Validate provider config
- `testConnection()` - Test provider connection

## Event System

### EventEmitter

**Location:** `src/events/EventEmitter.ts`

Custom event emitter with priority and async support.

**Features:**
- Priority-based handlers
- Async/sync handler support
- Once listeners
- Error handling
- Max listeners warning

**Event Flow:**
```
User Action → SDK Method → Provider → Events
                ↓              ↓
           Emit Events ← Emit Events
                ↓
           Event Handlers
```

### Event Types

**Defined in:** `src/types/events.ts`

**Naming Events:**
- `NamingStart` - Before naming starts
- `NamingComplete` - After successful naming
- `NamingError` - On naming error

**Batch Events:**
- `BatchStart` - Batch operation starts
- `BatchProgress` - Progress update
- `BatchComplete` - Batch finished
- `BatchError` - Batch error

**Provider Events:**
- `ProviderRequest` - Before provider request
- `ProviderResponse` - After provider response
- `ProviderError` - Provider error
- `ProviderRateLimit` - Rate limit hit

**System Events:**
- `ConfigUpdate` - Configuration changed
- `CacheHit` - Cache hit
- `FileAnalysisStart` - File analysis starts
- `FileAnalysisComplete` - Analysis complete

## Type System

### Type Organization

```
types/
├── config.ts          # Configuration schemas (Zod)
├── provider.ts        # Provider interfaces
├── naming.ts          # Naming types
├── file.ts           # File-related types
├── events.ts         # Event types
├── ai-clients.ts     # AI SDK client types
└── index.ts          # Central export
```

### Type Philosophy

1. **Zod Schemas** for runtime validation
2. **TypeScript Interfaces** for compile-time checking
3. **No `any` types** - strict type safety
4. **Exported from central location** (`types/index.ts`)

### Key Type Patterns

**Configuration:**
```typescript
// Schema definition
export const SDKConfigSchema = z.object({...});

// Type inference
export type SDKConfig = z.infer<typeof SDKConfigSchema>;
```

**Provider Response:**
```typescript
export interface NamingResponse {
  originalName: string;
  suggestedName: string;
  confidence: number;
  reasoning?: string;
  alternatives?: string[];
  error?: NamingError;
}
```

## Data Flow

### Single File Naming

```
1. User calls SDK.nameFile(path, options)
   ↓
2. SDK validates file
   ↓
3. SDK checks cache
   ↓ (cache miss)
4. SDK analyzes file (FileUtils)
   ↓
5. SDK builds context
   ↓
6. SDK calls Provider.generateName()
   ↓
7. Provider prepares request
   ↓
8. Provider executes AI request
   ↓
9. Provider sanitizes response
   ↓
10. SDK applies naming options
   ↓
11. SDK caches result
   ↓
12. SDK emits events
   ↓
13. Return response to user
```

### Batch Naming

```
1. User calls SDK.nameBatch(files, options)
   ↓
2. SDK resolves file pattern/list
   ↓
3. SDK creates p-queue with concurrency
   ↓
4. For each file (parallel):
   ├─ nameFile() ─→ (same as single flow)
   ├─ Emit progress event
   └─ Track success/failure
   ↓
5. Wait for all files
   ↓
6. Aggregate results
   ↓
7. Emit batch complete
   ↓
8. Return BatchNamingResult
```

## Caching Strategy

### Cache Implementation

**Location:** `FileNamingSDK.cache`

**Type:** `Map<string, NamingResponse>`

**Key Generation:**
```typescript
key = hash(filePath) + "-" + hash(options)
```

**Features:**
- TTL-based expiration
- Size limits (LRU eviction planned)
- Per-request cache control
- Cache statistics

### Cache Flow

```
Request → Check Cache → Hit? → Return cached
            ↓ Miss
         Process → Store in cache → Return result
```

## Error Handling

### Error Hierarchy

```
NamingError
├── RATE_LIMIT      (retryable)
├── AUTH_ERROR      (not retryable)
├── NETWORK_ERROR   (retryable)
├── PROVIDER_ERROR  (depends)
└── UNKNOWN_ERROR   (not retryable)
```

### Error Flow

```
Error occurs
   ↓
Provider.handleError()
   ↓
Classify error type
   ↓
Set retryable flag
   ↓
Emit ProviderError event
   ↓
Return error in response
```

## Performance Considerations

### Concurrency Control

- Batch operations use `p-queue`
- Configurable concurrency limit
- Default: 5 concurrent requests
- Prevents rate limit issues

### Caching

- Reduces API calls
- Improves response time
- Configurable TTL
- Per-file hash-based keys

### Event System

- Non-blocking event emission
- Async handlers don't block main flow
- Error isolation in handlers

## Security

### API Key Management

- Never log API keys
- Environment variable loading
- Validation without exposure
- Truncated keys in logs (first/last 4 chars)

### Input Validation

- Zod schema validation
- File path sanitization
- Model name validation
- Size limit checking

### Path Traversal Protection

- Planned for Phase 3
- Base path validation
- Relative path blocking
- System directory protection

## Extensibility

### Adding New Providers

1. Extend `AIProvider`
2. Implement abstract methods
3. Register in `ProviderRegistry`
4. Add configuration schema
5. Export from `providers/index.ts`

### Adding New Features

1. Define types in `types/`
2. Implement in appropriate module
3. Expose through main SDK
4. Add tests
5. Update documentation

### Custom Event Handlers

```typescript
sdk.on(EventName.NamingComplete, async (event) => {
  // Custom logic
  await saveToDatabase(event);
});
```

## Testing Strategy

### Unit Tests (Jest)

- Mock external dependencies
- Test isolated functionality
- >80% code coverage target

### Integration Tests

- Real provider testing
- End-to-end workflows
- Manual test scripts

### Test Organization

```
tests/
├── setup.ts          # Jest configuration
├── unit/            # (planned) Unit tests
└── integration/     # (current) Manual tests
```

## Future Improvements

### Planned Enhancements

1. **Retry Logic** - Exponential backoff
2. **Rate Limiting** - Client-side throttling
3. **LRU Cache** - Proper cache eviction
4. **Request Cancellation** - AbortController
5. **Streaming Support** - Real-time naming
6. **Batch Optimization** - Semantic grouping
7. **Plugin System** - Custom analyzers

### Architecture Evolution

- Microkernel architecture
- Plugin-based extensions
- Middleware pipeline
- Advanced caching strategies
- Distributed processing support

## References

- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- [Zod Documentation](https://zod.dev/)
- [p-queue](https://github.com/sindresorhus/p-queue)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
