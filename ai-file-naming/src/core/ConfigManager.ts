/**
 * Configuration Manager for the SDK
 */

import {
  SDKConfig,
  SDKConfigSchema,
  PartialSDKConfig,
  ConfigValidationResult,
} from '../types/config';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as nodePath from 'path';
import { EventEmitter } from '../events/EventEmitter';
import { EventName } from '../types/events';

/**
 * Configuration Manager class
 */
export class ConfigManager extends EventEmitter {
  private config: SDKConfig;
  private configPath?: string;
  private defaultConfig: SDKConfig;

  constructor(config?: PartialSDKConfig, configPath?: string) {
    super();

    // Set default configuration
    this.defaultConfig = this.getDefaultConfig();

    // Merge with provided config
    this.config = this.mergeConfig(this.defaultConfig, config ?? {});

    // Store config path for persistence
    this.configPath = configPath;
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): SDKConfig {
    return {
      provider: {
        type: 'openai',
        maxRetries: 3,
        timeout: 30000,
        temperature: 0.7,
      },
      naming: {
        format: 'preserve',
        maxLength: 100,
        sanitize: true,
        replaceSpaces: '_',
        removeSpecialChars: true,
      },
      batch: {
        concurrency: 5,
        chunkSize: 10,
        retryFailedItems: true,
      },
      cache: {
        enabled: true,
        ttl: 3600000, // 1 hour
        maxSize: 100,
      },
      logging: {
        level: 'info',
        format: 'pretty',
      },
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): SDKConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  async updateConfig(updates: PartialSDKConfig): Promise<ConfigValidationResult> {
    // Validate updates
    const validation = await this.validateConfig({ ...this.config, ...updates });

    if (!validation.valid) {
      return validation;
    }

    // Merge updates
    this.config = this.mergeConfig(this.config, updates);

    // Emit config update event
    this.emit(EventName.ConfigUpdate, {
      changes: updates,
      timestamp: new Date(),
      eventId: `config-update-${Date.now()}`,
    });

    // Save to file if path is set
    if (this.configPath) {
      await this.saveConfig();
    }

    return { valid: true };
  }

  /**
   * Load configuration from file
   */
  async loadConfig(filePath?: string): Promise<ConfigValidationResult> {
    const path = filePath ?? this.configPath;

    if (!path) {
      return {
        valid: false,
        errors: [{ path: 'configPath', message: 'No configuration file path provided' }],
      };
    }

    try {
      const content = await fs.readFile(path, 'utf-8');
      const data = JSON.parse(content) as unknown;

      // Validate loaded config
      const validation = await this.validateConfig(data);

      if (!validation.valid) {
        return validation;
      }

      // Update config
      this.config = data as SDKConfig;
      this.configPath = path;

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        errors: [
          {
            path: 'file',
            message: `Failed to load config: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }

  /**
   * Save configuration to file
   */
  async saveConfig(filePath?: string): Promise<void> {
    const path = filePath ?? this.configPath;

    if (!path) {
      throw new Error('No configuration file path provided');
    }

    // Ensure directory exists
    await fs.mkdir(nodePath.dirname(filePath ?? this.configPath ?? ''), { recursive: true });

    // Save config
    await fs.writeFile(path, JSON.stringify(this.config, null, 2), 'utf-8');
    this.configPath = path;
  }

  /**
   * Load configuration from environment variables
   * Note: Returns loosely typed config object for environment variable loading
   */
  loadFromEnv(): PartialSDKConfig {
    /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
    const config: any = {};

    // Provider configuration
    if (process.env['AI_PROVIDER_TYPE']) {
      config.provider = config.provider ?? {};
      config.provider.type = process.env['AI_PROVIDER_TYPE'];
    }

    if (process.env['AI_PROVIDER_API_KEY']) {
      config.provider = config.provider ?? {};
      config.provider.apiKey = process.env['AI_PROVIDER_API_KEY'];
    }

    if (process.env['AI_PROVIDER_BASE_URL']) {
      config.provider = config.provider ?? {};
      config.provider.baseURL = process.env['AI_PROVIDER_BASE_URL'];
    }

    if (process.env['AI_PROVIDER_MODEL']) {
      config.provider = config.provider ?? {};
      config.provider.model = process.env['AI_PROVIDER_MODEL'];
    }

    // Naming configuration
    if (process.env['AI_NAMING_FORMAT']) {
      config.naming = config.naming ?? {};
      config.naming.format = process.env['AI_NAMING_FORMAT'];
    }

    if (process.env['AI_NAMING_MAX_LENGTH']) {
      config.naming = config.naming ?? {};
      config.naming.maxLength = parseInt(process.env['AI_NAMING_MAX_LENGTH'], 10);
    }

    // Batch configuration
    if (process.env['AI_BATCH_CONCURRENCY']) {
      config.batch = config.batch ?? {};
      config.batch.concurrency = parseInt(process.env['AI_BATCH_CONCURRENCY'], 10);
    }

    // Logging configuration
    if (process.env['AI_LOG_LEVEL']) {
      config.logging = config.logging ?? {};
      config.logging.level = process.env['AI_LOG_LEVEL'];
    }

    return config as PartialSDKConfig;
    /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
  }

  /**
   * Validate configuration
   */
  async validateConfig(config: unknown): Promise<ConfigValidationResult> {
    try {
      // Parse with Zod schema
      const parsed = await SDKConfigSchema.parseAsync(config);

      // Additional custom validations
      const warnings: Array<{ path: string; message: string }> = [];

      // Check for API key in production
      if (process.env['NODE_ENV'] === 'production' && !parsed.provider.apiKey) {
        warnings.push({
          path: 'provider.apiKey',
          message: 'API key is not set for production environment',
        });
      }

      // Check naming config
      if (parsed.naming.maxLength < 10) {
        warnings.push({
          path: 'naming.maxLength',
          message: 'Max length is very short, may result in truncated names',
        });
      }

      // Check batch config
      if (parsed.batch.concurrency > 20) {
        warnings.push({
          path: 'batch.concurrency',
          message: 'High concurrency may hit rate limits',
        });
      }

      return {
        valid: true,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        }));

        return {
          valid: false,
          errors,
        };
      }

      return {
        valid: false,
        errors: [
          {
            path: 'unknown',
            message: error instanceof Error ? error.message : 'Unknown validation error',
          },
        ],
      };
    }
  }

  /**
   * Reset configuration to defaults
   */
  resetConfig(): void {
    this.config = this.getDefaultConfig();

    // Emit config update event
    this.emit(EventName.ConfigUpdate, {
      changes: { reset: true },
      timestamp: new Date(),
      eventId: `config-reset-${Date.now()}`,
    });
  }

  /**
   * Get configuration value by path
   */
  get<T = unknown>(path: string): T | undefined {
    const keys = path.split('.');
    let current: unknown = this.config;

    for (const key of keys) {
      if (current === null || current === undefined || typeof current !== 'object' || !key) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[key];
    }

    return current as T;
  }

  /**
   * Set configuration value by path
   */
  async set(path: string, value: unknown): Promise<ConfigValidationResult> {
    const keys = path.split('.');
    const updates: Record<string, unknown> = {};
    let current: Record<string, unknown> = updates;

    // Build nested object
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!key) continue;
      current[key] = {};
      current = current[key] as Record<string, unknown>;
    }
    const lastKey = keys[keys.length - 1];
    if (lastKey) {
      current[lastKey] = value;
    }

    // Update config
    return this.updateConfig(updates as PartialSDKConfig);
  }

  /**
   * Merge configurations
   */
  private mergeConfig(base: SDKConfig, updates: PartialSDKConfig): SDKConfig {
    const merged = { ...base };

    // Deep merge
    if (updates.provider) {
      merged.provider = { ...base.provider, ...updates.provider };
    }

    if (updates.naming) {
      merged.naming = { ...base.naming, ...updates.naming };
    }

    if (updates.batch) {
      merged.batch = { ...base.batch, ...updates.batch };
    }

    if (updates.cache) {
      merged.cache = { ...base.cache, ...updates.cache };
    }

    if (updates.logging) {
      merged.logging = { ...base.logging, ...updates.logging };
    }

    return merged;
  }

  /**
   * Export configuration
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration
   */
  async importConfig(configString: string): Promise<ConfigValidationResult> {
    try {
      const config = JSON.parse(configString) as unknown;
      return this.updateConfig(config as PartialSDKConfig);
    } catch (error) {
      return {
        valid: false,
        errors: [
          {
            path: 'import',
            message: `Failed to parse config: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }
}
