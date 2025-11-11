/**
 * Anthropic (Claude) Provider implementation
 */

import { AIProvider } from '../base/AIProvider';
import {
  ProviderCapabilities,
  ProviderRequestContext,
  ProviderResponse,
} from '../../types/provider';
import { AnthropicConfig } from '../../types/config';
import { AnthropicClient, AnthropicMessage, AnthropicMessageContent } from '../../types/ai-clients';

/**
 * Anthropic Provider class
 */
export class AnthropicProvider extends AIProvider {
  readonly name = 'anthropic';

  readonly capabilities: ProviderCapabilities = {
    supportsVision: true,
    supportsStreaming: true,
    supportsBatch: false,
    supportsCustomModels: true,
    maxTokens: 200000, // Claude 3 models support up to 200K tokens
    maxImageSize: 5 * 1024 * 1024, // 5MB per image
    maxImageCount: 20,
    supportedImageFormats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    supportedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  };

  declare protected config: AnthropicConfig;
  declare protected client: AnthropicClient;

  /**
   * Initialize Anthropic client
   */
  protected override initializeClient(): unknown {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
      const Anthropic = require('@anthropic-ai/sdk');

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      return new Anthropic.default({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseURL,
        maxRetries: this.config.maxRetries,
        timeout: this.config.timeout,
      }) as AnthropicClient;
    } catch (error) {
      this.providerLogger.warn(
        'Anthropic SDK not installed. Install it with: npm install @anthropic-ai/sdk',
      );

      // Return a mock client for development
      return {
        messages: {
          // eslint-disable-next-line @typescript-eslint/require-await
          create: async () => {
            throw new Error('Anthropic SDK not installed');
          },
        },
      };
    }
  }

  /**
   * Execute request to Anthropic
   */
  protected async executeRequest(context: ProviderRequestContext): Promise<ProviderResponse> {
    try {
      const messages = this.buildMessages(context);

      // Make request to Anthropic
      const response = await this.client.messages.create({
        model: this.config.model ?? 'claude-3-opus-20240229',
        max_tokens: context.maxTokens ?? this.config.maxTokens ?? 1024,
        temperature: context.temperature ?? this.config.temperature,
        messages,
      });

      if (!response.content || response.content.length === 0) {
        throw new Error('No content in Anthropic response');
      }

      const textContent = response.content.find((c) => c.type === 'text');
      if (!textContent) {
        throw new Error('No text content in Anthropic response');
      }

      // Extract suggested name from response
      const suggestedName = this.sanitizeResponse(textContent.text);

      // Calculate confidence based on stop reason
      const confidence = response.stop_reason === 'end_turn' ? 0.95 : 0.8;

      // Update token usage metrics
      if (response.usage) {
        this.metrics.totalTokensUsed += response.usage.input_tokens + response.usage.output_tokens;
      }

      return {
        originalName: context.request.context.originalName,
        suggestedName,
        confidence,
        reasoning: textContent.text,
        usage: response.usage
          ? {
              promptTokens: response.usage.input_tokens,
              completionTokens: response.usage.output_tokens,
              totalTokens: response.usage.input_tokens + response.usage.output_tokens,
            }
          : undefined,
        model: response.model,
        finishReason: response.stop_reason ?? undefined,
      };
    } catch (error) {
      throw this.transformError(error);
    }
  }

  /**
   * Build messages for Anthropic
   */
  private buildMessages(context: ProviderRequestContext): AnthropicMessage[] {
    const messages: AnthropicMessage[] = [];

    // Build message content
    const content: AnthropicMessageContent[] = [
      {
        type: 'text',
        text: context.userPrompt,
      },
    ];

    // Add images if present and supported
    if (context.images && context.images.length > 0) {
      for (const image of context.images) {
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: image.mimeType,
            data: image.data,
          },
        });
      }
    }

    messages.push({
      role: 'user',
      content,
    });

    return messages;
  }

  /**
   * Transform Anthropic errors
   */
  private transformError(error: unknown): Error {
    if (error && typeof error === 'object' && 'error' in error) {
      const apiError = error as {
        error?: {
          type?: string;
          message?: string;
        };
        message?: string;
      };
      const message = apiError.error?.message ?? apiError.message ?? 'Unknown error';

      // Rate limit error
      if (apiError.error?.type === 'rate_limit_error') {
        return new Error(`Rate limit exceeded: ${message}`);
      }

      // Authentication error
      if (apiError.error?.type === 'authentication_error') {
        return new Error(`Authentication failed: ${message}`);
      }

      // Invalid request
      if (apiError.error?.type === 'invalid_request_error') {
        return new Error(`Invalid request: ${message}`);
      }

      return new Error(`Anthropic API error: ${message}`);
    }

    if (error instanceof Error) {
      return error;
    }

    return new Error('Unknown error occurred');
  }

  /**
   * Perform connection test
   */
  protected async performConnectionTest(): Promise<boolean> {
    try {
      // Try a minimal API call
      const response = await this.client.messages.create({
        model: this.config.model || 'claude-3-haiku-20240307', // Use fastest model for testing
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }],
      });
      return !!response;
    } catch {
      return false;
    }
  }

  /**
   * Check if provider requires API key
   */
  protected requiresApiKey(): boolean {
    return true;
  }

  /**
   * Check if model is valid
   */
  protected isValidModel(model: string): boolean {
    const validModels = [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-3-5-sonnet-20240620',
      'claude-2.1',
      'claude-2.0',
    ];

    // Allow any model that starts with claude- for future compatibility
    return validModels.includes(model) || model.startsWith('claude-');
  }

  /**
   * Stream generate implementation
   */
  override async *streamGenerate(
    prompt: string,
    context: import('../../types/file').FileContext,
  ): AsyncGenerator<{ content: string; isComplete: boolean }> {
    try {
      const messages = this.buildMessages({
        request: {
          id: `stream-${Date.now()}`,
          context,
          prompt,
        },
        userPrompt: prompt,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
      });

      const stream = (await this.client.messages.create({
        model: this.config.model ?? 'claude-3-opus-20240229',
        max_tokens: this.config.maxTokens ?? 1024,
        temperature: this.config.temperature,
        messages,
        stream: true,
      })) as AsyncIterable<import('../../types/ai-clients').AnthropicStreamChunk>;

      let fullContent = '';
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
          fullContent += chunk.delta.text;
          yield {
            content: fullContent,
            isComplete: false,
          };
        } else if (chunk.type === 'message_stop') {
          yield {
            content: fullContent,
            isComplete: true,
          };
        }
      }
    } catch (error) {
      yield {
        content: '',
        isComplete: true,
        error: this.transformError(error).message,
      } as { content: string; isComplete: boolean; error?: string };
    }
  }
}
