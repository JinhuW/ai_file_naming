/**
 * Base AI Provider abstract class
 */

import {
  ProviderCapabilities,
  ProviderStatus,
  ProviderValidationResult,
  ConnectionTestResult,
  PreparedImage,
  ProviderRequestContext,
  ProviderResponse,
  ProviderMetrics,
  RateLimitInfo,
  StreamChunk,
} from '../../types/provider';
import { NamingRequest, NamingResponse, NamingError } from '../../types/naming';
import { FileContext, FileType } from '../../types/file';
import { BaseProviderConfig } from '../../types/config';
import { EventEmitter } from '../../events/EventEmitter';
import { EventName } from '../../types/events';
import { Logger } from '../../utils/Logger';

/**
 * Abstract base class for all AI providers
 */
export abstract class AIProvider extends EventEmitter {
  /**
   * Provider name identifier
   */
  abstract readonly name: string;

  /**
   * Provider capabilities
   */
  abstract readonly capabilities: ProviderCapabilities;

  /**
   * Provider configuration
   */
  protected config: BaseProviderConfig;

  /**
   * Provider client instance
   */
  protected client: unknown;

  /**
   * Provider status
   */
  protected status: ProviderStatus = {
    available: false,
    configured: false,
  };

  /**
   * Provider metrics
   */
  protected metrics: ProviderMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageLatency: 0,
    totalTokensUsed: 0,
    errors: [],
  };

  /**
   * Rate limit information
   */
  protected rateLimitInfo?: RateLimitInfo;

  /**
   * Logger instance
   */
  protected providerLogger: Logger;

  constructor(config: BaseProviderConfig) {
    super();
    this.config = config;
    this.providerLogger = Logger.getInstance();
    this.initializeProvider();
  }

  /**
   * Initialize the provider
   */
  protected initializeProvider(): void {
    try {
      this.client = this.initializeClient();
      this.status.configured = true;
      this.status.available = true;
    } catch (error) {
      this.status.configured = false;
      this.status.available = false;
      this.status.error = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  /**
   * Generate a name for a single file
   */
  async generateName(prompt: string, context: FileContext): Promise<NamingResponse> {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      // Emit request event
      this.emit(EventName.ProviderRequest, {
        provider: this.name,
        prompt,
        timestamp: new Date(),
      });

      // Prepare the request
      const requestContext = await this.prepareRequest(prompt, context);

      // Execute the request with retry logic
      const response = await this.executeWithRetry(
        () => this.executeRequest(requestContext),
        this.config.maxRetries,
      );

      // Update metrics
      this.metrics.successfulRequests++;
      const latency = Date.now() - startTime;
      this.updateAverageLatency(latency);

      // Emit response event
      this.emit(EventName.ProviderResponse, {
        provider: this.name,
        response,
        duration: latency,
        timestamp: new Date(),
      });

      return response;
    } catch (error) {
      this.metrics.failedRequests++;
      const namingError = this.handleError(error);

      // Record error in metrics
      this.metrics.errors.push({
        timestamp: new Date(),
        error: namingError.message,
        context: { prompt, filePath: context.filePath },
      });

      // Emit error event
      this.emit(EventName.ProviderError, {
        provider: this.name,
        error,
        retryable: namingError.retryable ?? false,
        timestamp: new Date(),
      });

      return {
        originalName: context.originalName,
        suggestedName: context.originalName,
        confidence: 0,
        error: namingError,
      };
    }
  }

  /**
   * Execute a function with retry logic and exponential backoff
   */
  protected async executeWithRetry<T>(fn: () => Promise<T>, maxRetries: number = 3): Promise<T> {
    let lastError: Error | undefined;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempt++;

        // Check if error is retryable
        const namingError = this.handleError(error);
        if (!namingError.retryable || attempt > maxRetries) {
          throw lastError;
        }

        // Calculate delay with exponential backoff
        const baseDelay = 1000; // 1 second
        const maxDelay = 10000; // 10 seconds
        const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);

        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.3 * delay; // ±30% jitter
        const finalDelay = delay + jitter;

        this.providerLogger.warn(
          `Retry attempt ${attempt}/${maxRetries} after ${Math.round(finalDelay)}ms`,
          {
            error: namingError.message,
            code: namingError.code,
          },
        );

        // Wait before retrying
        await this.sleep(finalDelay);
      }
    }

    throw lastError ?? new Error('Max retries exceeded');
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate names for multiple files
   */
  async generateBatchNames(requests: NamingRequest[]): Promise<NamingResponse[]> {
    // Default implementation: process sequentially
    // Providers can override for better batch support
    const responses: NamingResponse[] = [];

    for (const request of requests) {
      const prompt = request.prompt ?? this.buildDefaultPrompt(request.context);
      const response = await this.generateName(prompt, request.context);
      responses.push(response);
    }

    return responses;
  }

  /**
   * Stream generate a name (optional)
   */
  streamGenerate?(prompt: string, context: FileContext): AsyncGenerator<StreamChunk>;

  /**
   * Validate provider configuration
   */
  validateConfig(): Promise<ProviderValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required configuration
    if (!this.config.type) {
      errors.push('Provider type is required');
    }

    // Check API key if required
    if (this.requiresApiKey() && !this.config.apiKey) {
      errors.push('API key is required for this provider');
    }

    // Check model if specified
    if (this.config.model && !this.isValidModel(this.config.model)) {
      warnings.push(`Model '${this.config.model}' may not be supported`);
    }

    return Promise.resolve({
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      capabilities: this.capabilities,
    });
  }

  /**
   * Test provider connection
   */
  async testConnection(): Promise<ConnectionTestResult> {
    const startTime = Date.now();

    try {
      const result = await this.performConnectionTest();
      const latency = Date.now() - startTime;

      return {
        success: result,
        latency,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
      };
    }
  }

  /**
   * Get provider status
   */
  getStatus(): ProviderStatus {
    return { ...this.status };
  }

  /**
   * Get provider metrics
   */
  getMetrics(): ProviderMetrics {
    return { ...this.metrics };
  }

  /**
   * Get rate limit information
   */
  getRateLimitInfo(): RateLimitInfo | undefined {
    return this.rateLimitInfo ? { ...this.rateLimitInfo } : undefined;
  }

  /**
   * Reset provider metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
      totalTokensUsed: 0,
      errors: [],
    };
  }

  /**
   * Update provider configuration
   */
  updateConfig(config: Partial<BaseProviderConfig>): void {
    this.config = { ...this.config, ...config };
    this.initializeProvider();
  }

  /**
   * Abstract methods that must be implemented by providers
   */

  /**
   * Initialize the provider client
   */
  protected abstract initializeClient(): unknown;

  /**
   * Execute the actual request to the provider
   */
  protected abstract executeRequest(context: ProviderRequestContext): Promise<ProviderResponse>;

  /**
   * Perform a connection test
   */
  protected abstract performConnectionTest(): Promise<boolean>;

  /**
   * Check if the provider requires an API key
   */
  protected abstract requiresApiKey(): boolean;

  /**
   * Check if a model is valid for this provider
   */
  protected abstract isValidModel(model: string): boolean;

  /**
   * Helper methods
   */

  /**
   * Prepare images for the request
   */
  protected async prepareImages(imagePaths: string[]): Promise<PreparedImage[]> {
    const FileUtils = await import('../../utils/FileUtils');
    const preparedImages: PreparedImage[] = [];

    for (const imagePath of imagePaths) {
      try {
        const prepared = await FileUtils.prepareImage(imagePath, {
          maxWidth: 1024,
          maxHeight: 1024,
          maxSize: this.capabilities.maxImageSize ?? 4 * 1024 * 1024, // 4MB default
          format: 'jpeg',
          quality: 85,
        });
        preparedImages.push(prepared);
      } catch (error) {
        // Silently skip failed images - already logged at higher level if needed
      }
    }

    return preparedImages;
  }

  /**
   * Build default prompt
   */
  protected buildDefaultPrompt(context: FileContext): string {
    const fileType = context.analysis.fileType;

    let prompt = `Generate a descriptive filename for this ${fileType} file.\n`;
    prompt += `Current name: ${context.originalName}\n`;

    if (context.analysis.content?.summary) {
      prompt += `Content: ${context.analysis.content.summary}\n`;
    }

    if (context.analysis.content?.keywords?.length) {
      prompt += `Keywords: ${context.analysis.content.keywords.join(', ')}\n`;
    }

    prompt += '\nProvide a clear, descriptive filename that reflects the content.';
    prompt += '\nKeep the name concise but informative.';
    prompt += '\nDo not include the file extension in your response.';

    return prompt;
  }

  /**
   * Prepare request context
   */
  protected async prepareRequest(
    prompt: string,
    context: FileContext,
  ): Promise<ProviderRequestContext> {
    const request: NamingRequest = {
      id: this.generateRequestId(),
      context,
      prompt,
    };

    // Prepare images if the file is an image and provider supports vision
    let images: PreparedImage[] | undefined;
    if (this.capabilities.supportsVision && context.analysis.fileType === FileType.Image) {
      images = await this.prepareImages([context.filePath]);
    }

    return {
      request,
      images,
      userPrompt: prompt,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
    };
  }

  /**
   * Sanitize response
   */
  protected sanitizeResponse(response: string): string {
    // Remove common unwanted patterns
    let sanitized = response.trim();

    // Remove file extensions if present
    sanitized = sanitized.replace(/\.[a-zA-Z0-9]+$/, '');

    // Remove quotes
    sanitized = sanitized.replace(/^["']|["']$/g, '');

    // Remove "Filename:" or similar prefixes
    sanitized = sanitized.replace(/^(filename|name|file):\s*/i, '');

    // Ensure no path separators
    sanitized = sanitized.replace(/[/\\]/g, '_');

    return sanitized;
  }

  /**
   * Handle errors
   */
  protected override handleError(error: unknown): NamingError {
    if (error instanceof Error) {
      // Check for rate limit errors
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        this.emit(EventName.ProviderRateLimit, {
          provider: this.name,
          timestamp: new Date(),
        });

        return {
          code: 'RATE_LIMIT',
          message: 'Rate limit exceeded',
          details: error.message,
          retryable: true,
        };
      }

      // Check for auth errors
      if (
        error.message.includes('401') ||
        error.message.includes('403') ||
        error.message.includes('authentication') ||
        error.message.includes('unauthorized')
      ) {
        return {
          code: 'AUTH_ERROR',
          message: 'Authentication failed',
          details: error.message,
          retryable: false,
        };
      }

      // Check for network errors
      if (
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('network')
      ) {
        return {
          code: 'NETWORK_ERROR',
          message: 'Network error occurred',
          details: error.message,
          retryable: true,
        };
      }

      // Default error
      return {
        code: 'PROVIDER_ERROR',
        message: error.message,
        details: error.stack,
        retryable: false,
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      details: error,
      retryable: false,
    };
  }

  /**
   * Update average latency
   */
  private updateAverageLatency(newLatency: number): void {
    const totalLatency = this.metrics.averageLatency * (this.metrics.successfulRequests - 1);
    this.metrics.averageLatency = (totalLatency + newLatency) / this.metrics.successfulRequests;
  }

  /**
   * Generate request ID
   */
  private generateRequestId(): string {
    return `${this.name}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
}
