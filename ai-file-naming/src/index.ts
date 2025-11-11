/**
 * AI File Naming SDK
 *
 * Main entry point for the AI-powered file naming SDK
 */

// Main SDK export
export { FileNamingSDK } from './core/FileNamingSDK';
export { ConfigManager } from './core/ConfigManager';

// Token Optimization Components
export { ContentSampler } from './analyzers/ContentSampler';
export { MetadataExtractor } from './analyzers/MetadataExtractor';
export { PromptOptimizer } from './prompts/PromptOptimizer';
export { BatchGrouper } from './core/BatchGrouper';
export { SmartPipeline } from './core/SmartPipeline';

// Provider exports
export { AIProvider } from './providers/base/AIProvider';
export { ProviderRegistry } from './providers/ProviderRegistry';
export { OpenAIProvider } from './providers/openai/OpenAIProvider';
export { OllamaProvider } from './providers/ollama/OllamaProvider';
export { AnthropicProvider } from './providers/anthropic/AnthropicProvider';
export { GeminiProvider } from './providers/gemini/GeminiProvider';
export { initializeProviders } from './providers';

// Type exports
export * from './types';

// Utility exports
export * as FileUtils from './utils/FileUtils';
export * as CaseTransformer from './utils/CaseTransformer';
export { Logger, logger } from './utils/Logger';

// Event exports
export { EventEmitter } from './events/EventEmitter';

// Version
export const VERSION = '0.1.0';

// Default export
import { FileNamingSDK } from './core/FileNamingSDK';
export default FileNamingSDK;
