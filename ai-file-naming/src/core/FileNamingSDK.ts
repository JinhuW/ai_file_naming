/**
 * Main SDK class for AI File Naming
 */

import { ConfigManager } from './ConfigManager';
import { ProviderRegistry } from '../providers/ProviderRegistry';
import { AIProvider } from '../providers/base/AIProvider';
import { EventEmitter } from '../events/EventEmitter';
import { Logger } from '../utils/Logger';
import { SDKConfig, PartialSDKConfig, ConfigValidationResult } from '../types/config';
import { FileContext, FileAnalysisResult, FileProcessingOptions } from '../types/file';
import {
  NamingResponse,
  NamingOptions,
  BatchNamingResult,
  BatchNamingOptions,
} from '../types/naming';
import { EventName } from '../types/events';
import * as FileUtils from '../utils/FileUtils';
import { transformCase } from '../utils/CaseTransformer';
import * as path from 'path';
import PQueue from 'p-queue';
import { LRUCache } from 'lru-cache';

/**
 * Main SDK class
 */
export class FileNamingSDK extends EventEmitter {
  private configManager: ConfigManager;
  private provider: AIProvider | null = null;
  private sdkLogger: Logger;
  private cache: LRUCache<string, NamingResponse>;
  private abortControllers = new Map<string, AbortController>();

  constructor(config?: PartialSDKConfig) {
    super();

    // Initialize configuration manager
    this.configManager = new ConfigManager(config);

    // Initialize LRU cache
    const cacheConfig = this.configManager.getConfig().cache;
    this.cache = new LRUCache<string, NamingResponse>({
      max: cacheConfig.maxSize,
      ttl: cacheConfig.ttl,
      updateAgeOnGet: true, // Reset TTL on access
      updateAgeOnHas: false,
    });

    // Initialize logger
    const logConfig = this.configManager.getConfig().logging;
    this.sdkLogger = new Logger(logConfig.level, logConfig.format);

    // Initialize provider
    this.initializeProvider();

    // Set up event forwarding
    this.setupEventForwarding();

    this.sdkLogger.info('FileNamingSDK initialized', { config: this.configManager.getConfig() });
  }

  /**
   * Initialize AI provider
   */
  private initializeProvider(): void {
    const config = this.configManager.getConfig();

    try {
      this.provider = ProviderRegistry.getOrCreate(config.provider);
      this.sdkLogger.info(`Provider '${config.provider.type}' initialized`);
    } catch (error) {
      this.sdkLogger.error('Failed to initialize provider', error);
      throw new Error(
        `Failed to initialize provider: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Setup event forwarding from provider and config manager
   */
  private setupEventForwarding(): void {
    // Forward provider events
    if (this.provider) {
      this.provider.on(EventName.ProviderRequest, (event) =>
        this.emit(EventName.ProviderRequest, event),
      );
      this.provider.on(EventName.ProviderResponse, (event) =>
        this.emit(EventName.ProviderResponse, event),
      );
      this.provider.on(EventName.ProviderError, (event) =>
        this.emit(EventName.ProviderError, event),
      );
      this.provider.on(EventName.ProviderRateLimit, (event) =>
        this.emit(EventName.ProviderRateLimit, event),
      );
    }

    // Forward config events
    this.configManager.on(EventName.ConfigUpdate, (event) => {
      this.emit(EventName.ConfigUpdate, event);
      // Reinitialize provider if provider config changed
      const changes = event as { changes?: import('../types/ai-clients').ConfigUpdateChanges };
      if (changes.changes?.provider) {
        this.initializeProvider();
      }
      // Update logger if logging config changed
      if (changes.changes?.logging) {
        const logConfig = this.configManager.getConfig().logging;
        this.sdkLogger.setLevel(logConfig.level);
        this.sdkLogger.setFormat(logConfig.format);
      }
    });
  }

  /**
   * Name a single file
   */
  async nameFile(
    filePath: string,
    options?: NamingOptions & {
      prompt?: string;
      analyzeContent?: boolean;
      signal?: AbortSignal;
    },
  ): Promise<NamingResponse> {
    this.sdkLogger.debug('Naming file', { filePath, options });

    // Create request ID and AbortController
    const requestId = `naming-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const controller = new AbortController();
    this.abortControllers.set(requestId, controller);

    // Listen for external abort signal
    if (options?.signal) {
      options.signal.addEventListener('abort', () => {
        controller.abort();
      });
    }

    // Emit start event
    this.emit(EventName.NamingStart, {
      request: { filePath },
      provider: this.provider?.name,
      timestamp: new Date(),
      eventId: requestId,
    });

    const startTime = Date.now();

    try {
      // Validate file
      const validation = await FileUtils.validateFile(filePath);
      if (!validation.valid) {
        throw new Error(`File validation failed: ${validation.errors?.join(', ')}`);
      }

      // Check cache
      const cacheKey = await this.getCacheKey(filePath, options);
      if (this.configManager.getConfig().cache.enabled) {
        const cached = this.cache.get(cacheKey);
        if (cached) {
          this.emit(EventName.CacheHit, {
            key: cacheKey,
            hit: true,
            timestamp: new Date(),
            eventId: `cache-hit-${Date.now()}`,
          });
          this.sdkLogger.debug('Cache hit', { key: cacheKey });
          return cached;
        }
      }

      // Analyze file
      const analysis = await this.analyzeFile(filePath, {
        analyzeContent: options?.analyzeContent,
      });

      // Create context
      const context: FileContext = {
        filePath,
        analysis,
        originalName: path.basename(filePath),
        directory: path.dirname(filePath),
      };

      // Build prompt
      const prompt = options?.prompt ?? this.buildDefaultPrompt(context);

      // Generate name using provider
      if (!this.provider) {
        throw new Error('No provider initialized');
      }

      const response = await this.provider.generateName(prompt, context);

      // Apply naming options
      const finalResponse = this.applyNamingOptions(response, options);

      // Cache result (LRU cache handles TTL and eviction automatically)
      if (this.configManager.getConfig().cache.enabled) {
        this.cache.set(cacheKey, finalResponse);
        this.sdkLogger.debug('Cached result', {
          key: cacheKey,
          cacheSize: this.cache.size,
        });
      }

      // Emit complete event
      const duration = Date.now() - startTime;
      this.emit(EventName.NamingComplete, {
        request: { filePath },
        response: finalResponse,
        duration,
        timestamp: new Date(),
        eventId: `naming-complete-${Date.now()}`,
      });

      this.sdkLogger.info('File named successfully', {
        original: context.originalName,
        suggested: finalResponse.suggestedName,
        duration,
      });

      return finalResponse;
    } catch (error) {
      // Check if aborted
      if (controller.signal.aborted) {
        this.sdkLogger.warn('File naming cancelled', { filePath });
      }

      // Emit error event
      this.emit(EventName.NamingError, {
        request: { filePath },
        error: error instanceof Error ? error : new Error(String(error)),
        timestamp: new Date(),
        eventId: `naming-error-${Date.now()}`,
      });

      this.sdkLogger.error('Failed to name file', { filePath, error });
      throw error;
    } finally {
      // Clean up abort controller
      this.abortControllers.delete(requestId);
    }
  }

  /**
   * Cancel an ongoing naming request
   */
  cancelRequest(requestId: string): boolean {
    const controller = this.abortControllers.get(requestId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(requestId);
      this.sdkLogger.info('Request cancelled', { requestId });
      return true;
    }
    return false;
  }

  /**
   * Cancel all ongoing requests
   */
  cancelAllRequests(): number {
    const count = this.abortControllers.size;
    this.abortControllers.forEach((controller) => controller.abort());
    this.abortControllers.clear();
    this.sdkLogger.info('All requests cancelled', { count });
    return count;
  }

  /**
   * Name multiple files
   */
  async nameBatch(
    files: string[] | string,
    options?: BatchNamingOptions & {
      prompt?: string;
      mode?: 'batch' | 'semantic-batch';
    },
  ): Promise<BatchNamingResult> {
    this.sdkLogger.debug('Batch naming files', { files, options });

    // Resolve file list
    const fileList = typeof files === 'string' ? await this.resolveFilePattern(files) : files;

    if (fileList.length === 0) {
      return {
        successful: [],
        failed: [],
        totalProcessed: 0,
        totalSuccess: 0,
        totalFailed: 0,
        duration: 0,
      };
    }

    // Emit batch start event
    this.emit(EventName.BatchStart, {
      totalFiles: fileList.length,
      mode: options?.mode ?? 'batch',
      timestamp: new Date(),
      eventId: `batch-start-${Date.now()}`,
    });

    const startTime = Date.now();
    const config = this.configManager.getConfig();
    const concurrency = options?.concurrency ?? config.batch.concurrency;

    // Create queue for parallel processing
    const queue = new PQueue({ concurrency });
    const results: NamingResponse[] = [];
    const errors: Array<NamingResponse & { error: import('../types/naming').NamingError }> = [];

    // Process files
    let processed = 0;
    const tasks = fileList.map((filePath) =>
      queue.add(async () => {
        try {
          const result = await this.nameFile(filePath, {
            ...options,
            prompt: options?.prompt,
          });

          results.push(result);
          processed++;

          // Emit progress
          this.emit(EventName.BatchProgress, {
            processed,
            total: fileList.length,
            successful: results.length,
            failed: errors.length,
            currentFile: filePath,
            timestamp: new Date(),
            eventId: `batch-progress-${Date.now()}`,
          });
        } catch (error) {
          const namingError: import('../types/naming').NamingError = {
            code: 'NAMING_ERROR',
            message: error instanceof Error ? error.message : String(error),
            retryable: true,
          };

          const errorResponse: NamingResponse & { error: import('../types/naming').NamingError } = {
            originalName: path.basename(filePath),
            suggestedName: path.basename(filePath),
            confidence: 0,
            error: namingError,
          };

          errors.push(errorResponse);
          processed++;

          // Emit progress
          this.emit(EventName.BatchProgress, {
            processed,
            total: fileList.length,
            successful: results.length,
            failed: errors.length,
            currentFile: filePath,
            timestamp: new Date(),
            eventId: `batch-progress-${Date.now()}`,
          });

          if (!options?.continueOnError) {
            throw error;
          }
        }
      }),
    );

    try {
      await Promise.all(tasks);
    } catch (error) {
      // Batch error already handled above
      if (!options?.continueOnError) {
        this.emit(EventName.BatchError, {
          error: error instanceof Error ? error : new Error(String(error)),
          failedFiles: errors.map((e) => e.originalName),
          timestamp: new Date(),
          eventId: `batch-error-${Date.now()}`,
        });
      }
    }

    const duration = Date.now() - startTime;

    const result: BatchNamingResult = {
      successful: results,
      failed: errors,
      totalProcessed: processed,
      totalSuccess: results.length,
      totalFailed: errors.length,
      duration,
    };

    // Emit batch complete event
    this.emit(EventName.BatchComplete, {
      totalFiles: fileList.length,
      successful: results.length,
      failed: errors.length,
      duration,
      results,
      timestamp: new Date(),
      eventId: `batch-complete-${Date.now()}`,
    });

    this.sdkLogger.info('Batch naming completed', {
      total: fileList.length,
      successful: results.length,
      failed: errors.length,
      duration,
    });

    return result;
  }

  /**
   * Rename a file
   */
  async renameFile(
    filePath: string,
    options?: NamingOptions & {
      prompt?: string;
      dryRun?: boolean;
      overwrite?: boolean;
    },
  ): Promise<{ oldPath: string; newPath: string; newName: string }> {
    // Generate new name
    const namingResponse = await this.nameFile(filePath, options);

    if (options?.dryRun) {
      return {
        oldPath: filePath,
        newPath: path.join(
          path.dirname(filePath),
          namingResponse.suggestedName + path.extname(filePath),
        ),
        newName: namingResponse.suggestedName,
      };
    }

    // Actually rename the file
    const newPath = await FileUtils.renameFile(filePath, namingResponse.suggestedName, {
      preserveExtension: options?.preserveExtension !== false,
      overwrite: options?.overwrite,
    });

    this.sdkLogger.info('File renamed', {
      oldPath: filePath,
      newPath,
      newName: namingResponse.suggestedName,
    });

    return {
      oldPath: filePath,
      newPath,
      newName: namingResponse.suggestedName,
    };
  }

  /**
   * Analyze a file
   */
  private async analyzeFile(
    filePath: string,
    options?: FileProcessingOptions,
  ): Promise<FileAnalysisResult> {
    // Emit analysis start event
    this.emit(EventName.FileAnalysisStart, {
      filePath,
      fileSize: 0, // Will get actual size below
      timestamp: new Date(),
      eventId: `analysis-start-${Date.now()}`,
    });

    const startTime = Date.now();

    try {
      const metadata = await FileUtils.getFileMetadata(filePath);
      const fileType = FileUtils.detectFileType(filePath);

      const result: FileAnalysisResult = {
        filePath,
        fileName: path.basename(filePath),
        fileType,
        metadata,
      };

      // Add hash if requested
      if (options?.includeHash) {
        result.hash = await FileUtils.getFileHash(filePath);
      }

      // Emit analysis complete event
      const duration = Date.now() - startTime;
      this.emit(EventName.FileAnalysisComplete, {
        filePath,
        result,
        duration,
        timestamp: new Date(),
        eventId: `analysis-complete-${Date.now()}`,
      });

      return result;
    } catch (error) {
      // Emit analysis error event
      this.emit(EventName.FileAnalysisError, {
        filePath,
        error: error instanceof Error ? error : new Error(String(error)),
        timestamp: new Date(),
        eventId: `analysis-error-${Date.now()}`,
      });

      throw error;
    }
  }

  /**
   * Apply naming options to response
   */
  private applyNamingOptions(response: NamingResponse, options?: NamingOptions): NamingResponse {
    let name = response.suggestedName;
    const config = this.configManager.getConfig();

    // Apply case transformation
    const caseFormat = options?.caseFormat ?? config.naming.format;
    if (caseFormat !== 'preserve') {
      name = transformCase(name, caseFormat);
    }

    // Apply sanitization
    if (config.naming.sanitize) {
      name = FileUtils.sanitizeFilename(name, {
        replacement: config.naming.replaceSpaces,
        maxLength: options?.maxLength ?? config.naming.maxLength,
      });
    }

    // Add date if requested
    if (options?.includeDate) {
      const date = new Date().toISOString().split('T')[0];
      name = `${date}_${name}`;
    }

    // Add sequence if requested
    if (options?.includeSequence) {
      const timestamp = Date.now();
      name = `${name}_${timestamp}`;
    }

    return {
      ...response,
      suggestedName: name,
    };
  }

  /**
   * Build default prompt
   */
  private buildDefaultPrompt(context: FileContext): string {
    const config = this.configManager.getConfig();
    const fileType = context.analysis.fileType;
    const metadata = context.analysis.metadata;

    let prompt = `Generate a descriptive filename for this ${fileType} file.\n`;
    prompt += `Current name: ${context.originalName}\n`;
    prompt += `File size: ${FileUtils.formatSize(metadata.size)}\n`;
    prompt += `Last modified: ${metadata.modified.toISOString()}\n`;

    if (context.analysis.content?.summary) {
      prompt += `Content: ${context.analysis.content.summary}\n`;
    }

    prompt += '\nProvide a clear, descriptive filename that reflects the content.';
    prompt += '\nKeep the name concise but informative.';
    prompt += '\nDo not include the file extension in your response.';

    if (config.naming.format !== 'preserve') {
      prompt += `\nUse ${config.naming.format} format for the filename.`;
    }

    return prompt;
  }

  /**
   * Get cache key for a file
   */
  private async getCacheKey(filePath: string, options?: NamingOptions): Promise<string> {
    const hash = await FileUtils.getFileHash(filePath);
    const optionsStr = JSON.stringify(options ?? {});
    return `${hash}-${optionsStr}`;
  }

  /**
   * Resolve file pattern to file list
   */
  private async resolveFilePattern(pattern: string): Promise<string[]> {
    // If pattern is a directory, list all files
    try {
      const stat = await FileUtils.getFileMetadata(pattern);
      if (stat) {
        // It's a single file
        return [pattern];
      }
    } catch {
      // Not a single file, might be a directory or pattern
    }

    // Try as directory
    try {
      const files = await FileUtils.listFiles(pattern, {
        recursive: true,
        includeDirectories: false,
      });
      return files;
    } catch {
      // Not a directory, return empty array
      return [];
    }
  }

  /**
   * Update SDK configuration
   */
  async updateConfig(config: PartialSDKConfig): Promise<ConfigValidationResult> {
    return this.configManager.updateConfig(config);
  }

  /**
   * Get current configuration
   */
  getConfig(): SDKConfig {
    return this.configManager.getConfig();
  }

  /**
   * Validate provider
   */
  async validateProvider(): Promise<boolean> {
    if (!this.provider) {
      return false;
    }

    const result = await this.provider.validateConfig();
    return result.valid;
  }

  /**
   * Test provider connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.provider) {
      return false;
    }

    const result = await this.provider.testConnection();
    return result.success;
  }

  /**
   * Get provider status
   */
  getProviderStatus(): import('../types/provider').ProviderStatus | null {
    if (!this.provider) {
      return null;
    }

    return this.provider.getStatus();
  }

  /**
   * Get provider metrics
   */
  getProviderMetrics(): import('../types/provider').ProviderMetrics | null {
    if (!this.provider) {
      return null;
    }

    return this.provider.getMetrics();
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.sdkLogger.debug('Cache cleared');
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    enabled: boolean;
    ttl: number;
    hits: number;
    misses: number;
  } {
    const config = this.configManager.getConfig().cache;
    return {
      size: this.cache.size,
      maxSize: this.cache.max,
      enabled: config.enabled,
      ttl: config.ttl,
      hits: this.cache.calculatedSize, // Approximation of hits
      misses: 0, // LRU doesn't track misses directly
    };
  }

  /**
   * Destroy the SDK instance and clean up resources
   */
  destroy(): void {
    // Cancel all pending requests
    this.cancelAllRequests();

    // Clear cache and timers
    this.clearCache();

    // Remove all event listeners
    this.removeAllListeners();

    this.sdkLogger.info('FileNamingSDK destroyed');
  }
}
