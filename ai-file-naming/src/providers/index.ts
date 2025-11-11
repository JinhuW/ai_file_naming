/**
 * Provider exports and registration
 */

import { ProviderRegistry } from './ProviderRegistry';
import { OpenAIProvider } from './openai/OpenAIProvider';
import { OllamaProvider } from './ollama/OllamaProvider';
import { AnthropicProvider } from './anthropic/AnthropicProvider';
import { GeminiProvider } from './gemini/GeminiProvider';
import { Logger } from '../utils/Logger';

// Export providers
export { AIProvider } from './base/AIProvider';
export { OpenAIProvider } from './openai/OpenAIProvider';
export { OllamaProvider } from './ollama/OllamaProvider';
export { AnthropicProvider } from './anthropic/AnthropicProvider';
export { GeminiProvider } from './gemini/GeminiProvider';
export { ProviderRegistry } from './ProviderRegistry';

// Register all built-in providers
ProviderRegistry.register('openai', OpenAIProvider, {
  description: 'OpenAI GPT models with vision support',
  version: '1.0.0',
});

ProviderRegistry.register('ollama', OllamaProvider, {
  description: 'Local AI models through Ollama (llava, llama2, etc.)',
  version: '1.0.0',
});

ProviderRegistry.register('anthropic', AnthropicProvider, {
  description: 'Anthropic Claude models with vision support',
  version: '1.0.0',
});

ProviderRegistry.register('gemini', GeminiProvider, {
  description: 'Google Gemini models with vision support',
  version: '1.0.0',
});

/**
 * Initialize and register all built-in providers
 */
export function initializeProviders(): void {
  const logger = Logger.getInstance();
  logger.info('Providers initialized:', { providers: ProviderRegistry.getAvailable() });
}
