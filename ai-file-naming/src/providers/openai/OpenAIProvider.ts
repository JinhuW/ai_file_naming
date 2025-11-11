/**
 * OpenAI Provider implementation
 */

import { AIProvider } from '../base/AIProvider';
import {
  ProviderCapabilities,
  ProviderRequestContext,
  ProviderResponse,
} from '../../types/provider';
import { OpenAIConfig } from '../../types/config';
import {
  OpenAIClient,
  OpenAIMessage,
  OpenAIMessageContent,
  OpenAIChatCompletionResponse,
} from '../../types/ai-clients';

/**
 * OpenAI Provider class
 */
export class OpenAIProvider extends AIProvider {
  readonly name = 'openai';

  readonly capabilities: ProviderCapabilities = {
    supportsVision: true,
    supportsStreaming: true,
    supportsBatch: false,
    supportsCustomModels: true,
    maxTokens: 128000, // GPT-5 max context
    maxImageSize: 20 * 1024 * 1024, // 20MB
    maxImageCount: 10,
    supportedImageFormats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    supportedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  };

  declare protected config: OpenAIConfig;
  declare protected client: OpenAIClient;

  /**
   * Initialize OpenAI client
   */
  protected override initializeClient(): unknown {
    // Check if OpenAI package is installed
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
      const { OpenAI } = require('openai');

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      return new OpenAI({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseURL,
        organization: this.config.organization,
        maxRetries: this.config.maxRetries,
        timeout: this.config.timeout,
      }) as OpenAIClient;
    } catch (error) {
      // OpenAI package not installed
      this.providerLogger.warn('OpenAI package not installed. Install it with: npm install openai');

      // Return a mock client for development
      return {
        chat: {
          completions: {
            // eslint-disable-next-line @typescript-eslint/require-await
            create: async () => {
              throw new Error('OpenAI package not installed');
            },
          },
        },
        models: {
          // eslint-disable-next-line @typescript-eslint/require-await
          list: async () => {
            throw new Error('OpenAI package not installed');
          },
        },
      };
    }
  }

  /**
   * Execute request to OpenAI
   */
  protected async executeRequest(context: ProviderRequestContext): Promise<ProviderResponse> {
    try {
      const messages = this.buildMessages(context);

      // Make request to OpenAI (non-streaming)
      // GPT-5 models use max_completion_tokens instead of max_tokens
      const model = this.config.model ?? 'gpt-5-mini';
      const isGPT5 = model.includes('gpt-5') || model.includes('gpt-4.1');

      const requestParams: any = {
        model,
        messages,
        n: 1,
      };

      // GPT-5 models only support temperature=1 (default)
      if (!isGPT5) {
        requestParams.temperature = context.temperature ?? this.config.temperature;
      }

      // Use appropriate token parameter based on model
      // GPT-5 reasoning models need more tokens (reasoning + output)
      if (isGPT5) {
        requestParams.max_completion_tokens = context.maxTokens ?? this.config.maxTokens ?? 500;
      } else {
        requestParams.max_tokens = context.maxTokens ?? this.config.maxTokens ?? 150;
      }

      const response = (await this.client.chat.completions.create(requestParams)) as OpenAIChatCompletionResponse;

      const choice = response.choices[0];
      if (!choice?.message?.content) {
        throw new Error('No content in OpenAI response');
      }

      // Extract suggested name from response
      const suggestedName = this.sanitizeResponse(choice.message.content);

      // Calculate confidence based on finish reason
      const confidence = this.calculateConfidence(choice.finish_reason);

      // Update token usage metrics
      if (response.usage) {
        this.metrics.totalTokensUsed += response.usage.total_tokens;
      }

      return {
        originalName: context.request.context.originalName,
        suggestedName,
        confidence,
        reasoning: choice.message.content,
        usage: response.usage
          ? {
              promptTokens: response.usage.prompt_tokens,
              completionTokens: response.usage.completion_tokens,
              totalTokens: response.usage.total_tokens,
            }
          : undefined,
        model: response.model,
        finishReason: choice.finish_reason,
      };
    } catch (error) {
      throw this.transformError(error);
    }
  }

  /**
   * Build messages for OpenAI chat completion
   */
  private buildMessages(context: ProviderRequestContext): OpenAIMessage[] {
    const messages: OpenAIMessage[] = [];

    // Add system prompt
    messages.push({
      role: 'system',
      content: context.systemPrompt ?? this.getSystemPrompt(),
    });

    // Build user message
    const userContent: OpenAIMessageContent[] = [
      {
        type: 'text',
        text: context.userPrompt,
      },
    ];

    // Add images if present and model supports vision
    if (context.images && context.images.length > 0) {
      if (!this.isVisionModel(this.config.model ?? 'gpt-5-mini')) {
        this.providerLogger.warn('Model does not support vision. Images will be ignored.');
      } else {
        this.providerLogger.debug('Adding images to request', { count: context.images.length });
        for (const image of context.images) {
          this.providerLogger.debug('Image details', {
            mimeType: image.mimeType,
            size: image.data.length,
          });
          userContent.push({
            type: 'image_url',
            image_url: {
              url: `data:${image.mimeType};base64,${image.data}`,
              detail: 'auto',
            },
          });
        }
      }
    } else {
      this.providerLogger.debug('No images in context');
    }

    // Always use array format if we have images
    if (context.images && context.images.length > 0) {
      messages.push({
        role: 'user',
        content: userContent,
      });
    } else {
      messages.push({
        role: 'user',
        content: context.userPrompt,
      });
    }

    return messages;
  }

  /**
   * Get system prompt
   */
  private getSystemPrompt(): string {
    return `You are an AI assistant specialized in generating descriptive, clear, and organized filenames.
Your task is to suggest appropriate filenames based on file content, metadata, and context.

Guidelines:
- Generate concise but descriptive names
- Use appropriate separators (underscores or hyphens)
- Avoid special characters that may cause issues in file systems
- Consider the file type and content when naming
- Maintain consistency in naming patterns
- Do not include file extensions in the suggested name
- Respond with ONLY the suggested filename, no explanations or additional text`;
  }

  /**
   * Check if model supports vision
   */
  private isVisionModel(model: string): boolean {
    const visionModels = [
      'gpt-5',
      'gpt-5-mini',
      'gpt-5-nano',
    ];
    return visionModels.some((vm) => model.includes(vm));
  }

  /**
   * Calculate confidence based on finish reason
   */
  private calculateConfidence(finishReason?: string): number {
    switch (finishReason) {
      case 'stop':
        return 0.95; // Natural completion
      case 'length':
        return 0.7; // Hit token limit
      case 'content_filter':
        return 0.5; // Content filtered
      default:
        return 0.8; // Default confidence
    }
  }

  /**
   * Transform OpenAI errors to naming errors
   */
  private transformError(error: unknown): Error {
    if (error && typeof error === 'object' && 'response' in error) {
      const apiError = error as {
        response?: {
          status?: number;
          data?: { error?: { message?: string } };
          headers?: Record<string, string>;
        };
        message?: string;
      };
      const status = apiError.response?.status;
      const message =
        apiError.response?.data?.error?.message ?? apiError.message ?? 'Unknown error';

      // Rate limit error
      if (status === 429) {
        const resetTime = apiError.response?.headers?.['x-ratelimit-reset-requests'];
        if (resetTime) {
          this.rateLimitInfo = {
            resetAt: new Date(parseInt(resetTime, 10) * 1000),
          };
        }
        return new Error(`Rate limit exceeded: ${message}`);
      }

      // Authentication error
      if (status === 401) {
        return new Error(`Authentication failed: ${message}`);
      }

      // Other API errors
      return new Error(`OpenAI API error: ${message}`);
    }

    // Network or other errors
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
      const response = await this.client.models.list();
      return !!(response?.data && response.data.length > 0);
    } catch (error) {
      // If models.list fails, try a simple completion
      try {
        const response = await this.client.chat.completions.create({
          model: 'gpt-5-mini',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1,
        });
        return !!response;
      } catch {
        return false;
      }
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
      'gpt-5',
      'gpt-5-mini',
      'gpt-5-nano',
      'o1-preview',
      'o1-mini',
    ];

    // Allow any model that starts with gpt- or o1- for future compatibility
    return validModels.includes(model) || model.startsWith('gpt-') || model.startsWith('o1-');
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

      const model = this.config.model ?? 'gpt-5-mini';
      const isGPT5 = model.includes('gpt-5') || model.includes('gpt-4.1');

      const streamParams: any = {
        model,
        messages,
        stream: true,
      };

      // GPT-5 models only support temperature=1 (default)
      if (!isGPT5) {
        streamParams.temperature = this.config.temperature;
      }

      // Use appropriate token parameter
      // GPT-5 reasoning models need more tokens (reasoning + output)
      if (isGPT5) {
        streamParams.max_completion_tokens = this.config.maxTokens ?? 500;
      } else {
        streamParams.max_tokens = this.config.maxTokens ?? 150;
      }

      const stream = (await this.client.chat.completions.create(streamParams)) as AsyncIterable<OpenAIChatCompletionResponse>;

      let fullContent = '';
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content ?? '';
        fullContent += content;

        yield {
          content: fullContent,
          isComplete: chunk.choices[0]?.finish_reason === 'stop',
        };
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
