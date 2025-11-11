/**
 * Google Gemini Provider implementation
 */

import { AIProvider } from '../base/AIProvider';
import {
  ProviderCapabilities,
  ProviderRequestContext,
  ProviderResponse,
} from '../../types/provider';
import { GeminiConfig } from '../../types/config';
import { FileType } from '../../types/file';

/**
 * Gemini Provider class
 */
export class GeminiProvider extends AIProvider {
  readonly name = 'gemini';

  readonly capabilities: ProviderCapabilities = {
    supportsVision: true,
    supportsStreaming: true,
    supportsBatch: false,
    supportsCustomModels: true,
    maxTokens: 32768,
    maxImageSize: 4 * 1024 * 1024, // 4MB
    maxImageCount: 16,
    supportedImageFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
    supportedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
  };

  declare protected config: GeminiConfig;
  declare protected client: unknown;

  /**
   * Initialize Gemini client
   */
  protected override initializeClient(): unknown {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
      const { GoogleGenerativeAI } = require('@google/generative-ai');

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      return new GoogleGenerativeAI(this.config.apiKey);
    } catch (error) {
      this.providerLogger.warn(
        'Google Generative AI SDK not installed. Install it with: npm install @google/generative-ai',
      );

      // Return a mock client for development
      return {
        getGenerativeModel: () => ({
          // eslint-disable-next-line @typescript-eslint/require-await
          generateContent: async () => {
            throw new Error('Google Generative AI SDK not installed');
          },
        }),
      };
    }
  }

  /**
   * Execute request to Gemini
   */
  protected async executeRequest(context: ProviderRequestContext): Promise<ProviderResponse> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const model = (
        this.client as { getGenerativeModel: (config: { model: string }) => unknown }
      ).getGenerativeModel({
        model: this.config.model ?? 'gemini-pro-vision',
      });

      const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
        { text: context.userPrompt },
      ];

      // Add images if present
      if (context.images && context.images.length > 0) {
        for (const image of context.images) {
          parts.push({
            inlineData: {
              mimeType: image.mimeType,
              data: image.data,
            },
          });
        }
      }

      // Make request to Gemini
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const result = await (
        model as { generateContent: (parts: unknown) => Promise<unknown> }
      ).generateContent(parts);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const response = (result as { response: unknown }).response;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const text = (response as { text: () => string }).text();

      if (!text) {
        throw new Error('No content in Gemini response');
      }

      // Extract suggested name from response
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const suggestedName = this.sanitizeResponse(text);

      // Gemini doesn't provide confidence scores, so we default to 0.85
      const confidence = 0.85;

      // Gemini doesn't provide detailed token usage in the same way
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      const resultMetadata = (
        result as {
          usageMetadata?: {
            promptTokenCount?: number;
            candidatesTokenCount?: number;
            totalTokenCount?: number;
          };
        }
      ).usageMetadata;
      const usage = resultMetadata
        ? {
            promptTokens: resultMetadata.promptTokenCount ?? 0,
            completionTokens: resultMetadata.candidatesTokenCount ?? 0,
            totalTokens: resultMetadata.totalTokenCount ?? 0,
          }
        : undefined;

      if (usage) {
        this.metrics.totalTokensUsed += usage.totalTokens;
      }

      return {
        originalName: context.request.context.originalName,
        suggestedName,
        confidence,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        reasoning: text,
        usage,
        model: this.config.model ?? 'gemini-pro-vision',
      };
    } catch (error) {
      throw this.transformError(error);
    }
  }

  /**
   * Transform Gemini errors
   */
  private transformError(error: unknown): Error {
    if (error && typeof error === 'object' && 'message' in error) {
      const message = (error as { message: string }).message;

      // Rate limit error
      if (message.includes('quota') || message.includes('rate limit')) {
        return new Error(`Rate limit exceeded: ${message}`);
      }

      // Authentication error
      if (message.includes('API key') || message.includes('authentication')) {
        return new Error(`Authentication failed: ${message}`);
      }

      // Model not found
      if (message.includes('model')) {
        return new Error(`Model error: ${message}`);
      }

      return new Error(`Gemini API error: ${message}`);
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const model = (
        this.client as { getGenerativeModel: (config: { model: string }) => unknown }
      ).getGenerativeModel({
        model: 'gemini-pro', // Use non-vision model for testing
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const result = await (
        model as { generateContent: (prompt: string) => Promise<unknown> }
      ).generateContent('test');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      return !!(result as { response: unknown }).response;
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
    const validModels = ['gemini-pro', 'gemini-pro-vision', 'gemini-1.5-pro', 'gemini-1.5-flash'];

    // Allow any model that starts with gemini- for future compatibility
    return validModels.includes(model) || model.startsWith('gemini-');
  }

  /**
   * Stream generate implementation
   */
  override async *streamGenerate(
    prompt: string,
    context: import('../../types/file').FileContext,
  ): AsyncGenerator<{ content: string; isComplete: boolean }> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const model = (
        this.client as { getGenerativeModel: (config: { model: string }) => unknown }
      ).getGenerativeModel({
        model: this.config.model ?? 'gemini-pro',
      });

      const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
        { text: prompt },
      ];

      // Prepare images if present
      if (this.capabilities.supportsVision && context.analysis?.fileType === FileType.Image) {
        const preparedImages = await this.prepareImages([context.filePath]);
        for (const image of preparedImages) {
          parts.push({
            inlineData: {
              mimeType: image.mimeType,
              data: image.data,
            },
          });
        }
      }

      // Note: generateContentStream is not in our type definition
      // This is a known limitation of the Gemini SDK typing
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const result = (await (
        model as { generateContentStream: (req: unknown) => Promise<unknown> }
      ).generateContentStream({
        contents: [
          {
            role: 'user',
            parts,
          },
        ],
        generationConfig: {
          temperature: this.config.temperature,
        },
      })) as { stream: AsyncIterable<{ text: () => string }> };

      let fullContent = '';
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullContent += chunkText;
        yield {
          content: fullContent,
          isComplete: false,
        };
      }

      // Final chunk
      yield {
        content: fullContent,
        isComplete: true,
      };
    } catch (error) {
      yield {
        content: '',
        isComplete: true,
        error: this.transformError(error).message,
      } as { content: string; isComplete: boolean; error?: string };
    }
  }
}
