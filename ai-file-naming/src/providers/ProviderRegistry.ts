/**
 * Provider Registry for managing AI providers
 */

import { AIProvider } from './base/AIProvider';
import { BaseProviderConfig } from '../types/config';
import { Logger } from '../utils/Logger';

/**
 * Provider constructor type
 */
export type ProviderConstructor = new (config: BaseProviderConfig) => AIProvider;

/**
 * Provider registry entry
 */
interface ProviderEntry {
  constructor: ProviderConstructor;
  description?: string;
  version?: string;
}

/**
 * Provider Registry class
 */
export class ProviderRegistry {
  private static providers = new Map<string, ProviderEntry>();
  private static instances = new Map<string, AIProvider>();
  private static logger = Logger.getInstance();

  /**
   * Register a provider
   */
  static register(
    name: string,
    provider: ProviderConstructor,
    metadata?: { description?: string; version?: string },
  ): void {
    if (this.providers.has(name)) {
      this.logger.warn(`Provider '${name}' is already registered. Overwriting...`);
    }

    this.providers.set(name, {
      constructor: provider,
      description: metadata?.description,
      version: metadata?.version,
    });
  }

  /**
   * Unregister a provider
   */
  static unregister(name: string): boolean {
    // Remove instance if exists
    if (this.instances.has(name)) {
      this.instances.delete(name);
    }

    return this.providers.delete(name);
  }

  /**
   * Create a provider instance
   */
  static create(config: BaseProviderConfig): AIProvider {
    const entry = this.providers.get(config.type);

    if (!entry) {
      throw new Error(
        `Unknown provider: ${config.type}. Available providers: ${this.getAvailable().join(', ')}`,
      );
    }

    try {
      const provider = new entry.constructor(config);

      // Cache the instance
      const instanceKey = this.getInstanceKey(config);
      this.instances.set(instanceKey, provider);

      return provider;
    } catch (error) {
      throw new Error(
        `Failed to create provider '${config.type}': ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  /**
   * Get or create a provider instance
   */
  static getOrCreate(config: BaseProviderConfig): AIProvider {
    const instanceKey = this.getInstanceKey(config);

    // Check if instance already exists
    if (this.instances.has(instanceKey)) {
      const instance = this.instances.get(instanceKey);
      if (instance) {
        return instance;
      }
    }

    // Create new instance
    return this.create(config);
  }

  /**
   * Get an existing provider instance
   */
  static getInstance(name: string): AIProvider | undefined {
    // Try to find instance by name
    for (const [key, instance] of this.instances.entries()) {
      if (key.startsWith(`${name}-`)) {
        return instance;
      }
    }
    return undefined;
  }

  /**
   * Get all instances
   */
  static getAllInstances(): Map<string, AIProvider> {
    return new Map(this.instances);
  }

  /**
   * Clear all instances
   */
  static clearInstances(): void {
    this.instances.clear();
  }

  /**
   * Get available provider names
   */
  static getAvailable(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider is registered
   */
  static has(name: string): boolean {
    return this.providers.has(name);
  }

  /**
   * Get provider metadata
   */
  static getMetadata(name: string): { description?: string; version?: string } | undefined {
    const entry = this.providers.get(name);
    if (!entry) {
      return undefined;
    }

    return {
      description: entry.description,
      version: entry.version,
    };
  }

  /**
   * Get all providers with metadata
   */
  static getAllProviders(): Array<{
    name: string;
    description?: string;
    version?: string;
  }> {
    return Array.from(this.providers.entries()).map(([name, entry]) => ({
      name,
      description: entry.description,
      version: entry.version,
    }));
  }

  /**
   * Create multiple providers from config
   */
  static createMultiple(configs: BaseProviderConfig[]): AIProvider[] {
    return configs.map((config) => this.create(config));
  }

  /**
   * Validate provider configuration
   */
  static async validate(config: BaseProviderConfig): Promise<boolean> {
    try {
      const provider = this.create(config);
      const result = await provider.validateConfig();
      return result.valid;
    } catch {
      return false;
    }
  }

  /**
   * Test provider connection
   */
  static async testConnection(config: BaseProviderConfig): Promise<boolean> {
    try {
      const provider = this.create(config);
      const result = await provider.testConnection();
      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * Get instance key for caching
   */
  private static getInstanceKey(config: BaseProviderConfig): string {
    // Create a unique key based on provider type and API key (if present)
    const parts: string[] = [config.type];

    if (config.apiKey) {
      // Use first and last few characters of API key for uniqueness
      const keyPart = config.apiKey.slice(0, 4) + '...' + config.apiKey.slice(-4);
      parts.push(keyPart);
    }

    if (config.baseURL) {
      parts.push(config.baseURL);
    }

    if (config.model) {
      parts.push(config.model);
    }

    return parts.join('-');
  }
}
