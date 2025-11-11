/**
 * Ollama Provider implementation
 */

import { AIProvider } from '../base/AIProvider';
import {
  ProviderCapabilities,
  ProviderRequestContext,
  ProviderResponse,
} from '../../types/provider';
import { OllamaConfig } from '../../types/config';
import { OllamaClient, OllamaMessage } from '../../types/ai-clients';
import { FileType } from '../../types/file';

/**
 * Ollama Provider class for local AI models
 */
export class OllamaProvider extends AIProvider {
  readonly name = 'ollama';

  readonly capabilities: ProviderCapabilities = {
    supportsVision: true, // Models like llava support vision
    supportsStreaming: true,
    supportsBatch: false,
    supportsCustomModels: true,
    maxTokens: 4096,
    maxImageSize: 10 * 1024 * 1024, // 10MB
    maxImageCount: 1,
    supportedImageFormats: ['image/jpeg', 'image/png'],
    supportedMimeTypes: ['image/jpeg', 'image/png'],
  };

  declare protected config: OllamaConfig;
  declare protected client: OllamaClient;

  /**
   * Initialize Ollama client
   */
  protected override initializeClient(): unknown {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
      const { Ollama } = require('ollama');

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      return new Ollama({
        host: this.config.baseURL ?? 'http://localhost:11434',
      }) as OllamaClient;
    } catch (error) {
      this.providerLogger.warn('Ollama package not installed. Install it with: npm install ollama');

      // Return a mock client for development
      return {
        // eslint-disable-next-line @typescript-eslint/require-await
        chat: async () => {
          throw new Error('Ollama package not installed');
        },
        // eslint-disable-next-line @typescript-eslint/require-await
        generate: async () => {
          throw new Error('Ollama package not installed');
        },
      };
    }
  }

  /**
   * Execute request to Ollama
   */
  protected async executeRequest(context: ProviderRequestContext): Promise<ProviderResponse> {
    try {
      const model = this.config.model ?? 'llava';
      const messages: OllamaMessage[] = [];

      // Build images array for Ollama
      const images: string[] = [];

      // Add images if present
      if (context.images && context.images.length > 0) {
        for (const image of context.images) {
          images.push(image.data);
        }
      }

      messages.push({
        role: 'user',
        content: context.userPrompt,
        images: images.length > 0 ? images : undefined,
      });

      // Make request to Ollama
      const response = await this.client.chat({
        model,
        messages,
        options: {
          temperature: context.temperature ?? this.config.temperature,
          num_predict: context.maxTokens ?? this.config.maxTokens,
        },
      });

      if (!response?.message?.content) {
        throw new Error('No content in Ollama response');
      }

      // Extract suggested name from response
      const suggestedName = this.sanitizeResponse(response.message.content);

      // Ollama doesn't provide confidence scores, so we default to 0.8
      const confidence = 0.8;

      return {
        originalName: context.request.context.originalName,
        suggestedName,
        confidence,
        reasoning: response.message.content,
        model,
      };
    } catch (error) {
      throw this.transformError(error);
    }
  }

  /**
   * Transform Ollama errors
   */
  private transformError(error: unknown): Error {
    if (error instanceof Error) {
      // Check for connection errors
      if (error.message.includes('ECONNREFUSED')) {
        return new Error(
          'Cannot connect to Ollama. Make sure Ollama is running at ' + this.config.baseURL,
        );
      }

      // Model not found
      if (error.message.includes('model') && error.message.includes('not found')) {
        return new Error(
          `Model '${this.config.model}' not found. Pull it with: ollama pull ${this.config.model}`,
        );
      }

      return error;
    }

    return new Error('Unknown error occurred with Ollama');
  }

  /**
   * Perform connection test
   */
  protected async performConnectionTest(): Promise<boolean> {
    try {
      // Try a simple generate request
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const result = await this.client.generate({
        model: 'llama2',
        prompt: 'test',
        options: { num_predict: 1 },
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      return !!result.response;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if provider requires API key
   */
  protected requiresApiKey(): boolean {
    return false; // Ollama doesn't require an API key
  }

  /**
   * Check if model is valid
   */
  protected isValidModel(model: string): boolean {
    // Common Ollama models
    const commonModels = ['llava', 'llama2', 'llama3', 'mistral', 'codellama', 'phi', 'gemma'];

    // Allow any model name as Ollama supports custom models
    return commonModels.some((m) => model.includes(m)) || model.length > 0;
  }

  /**
   * Stream generate implementation
   */
  override async *streamGenerate(
    prompt: string,
    context: import('../../types/file').FileContext,
  ): AsyncGenerator<{ content: string; isComplete: boolean }> {
    try {
      const model = this.config.model ?? 'llava';
      const messages: OllamaMessage[] = [];

      // Prepare images if present
      let images: string[] | undefined;
      if (this.capabilities.supportsVision && context.analysis?.fileType === FileType.Image) {
        const preparedImages = await this.prepareImages([context.filePath]);
        images = preparedImages.map((img) => img.data);
      }

      messages.push({
        role: 'user',
        content: prompt,
        images,
      });

      const stream = (await this.client.chat({
        model,
        messages,
        stream: true,
        options: {
          temperature: this.config.temperature,
        },
      })) as unknown as AsyncIterable<{ message?: { content?: string }; done?: boolean }>;

      let fullContent = '';
      for await (const chunk of stream) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const messageContent: string | undefined = chunk.message?.content;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const isDone: boolean = chunk.done ?? false;
        if (messageContent) {
          fullContent += messageContent;
          yield {
            content: fullContent,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            isComplete: isDone,
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
