/**
 * Configuration types for the AI File Naming SDK
 */

import { z } from 'zod';

/**
 * Supported AI provider types
 */
export type ProviderType = 'openai' | 'anthropic' | 'ollama' | 'gemini' | 'custom';

/**
 * Base configuration for AI providers
 */
export const BaseProviderConfigSchema = z.object({
  type: z.enum(['openai', 'anthropic', 'ollama', 'gemini', 'custom']),
  apiKey: z.string().optional(),
  baseURL: z.string().url().optional(),
  model: z.string().optional(),
  maxRetries: z.number().int().min(0).max(10).default(3),
  timeout: z.number().int().min(0).default(30000), // 30 seconds default
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().min(1).optional(),
});

export type BaseProviderConfig = z.infer<typeof BaseProviderConfigSchema>;

/**
 * OpenAI-specific configuration
 */
export const OpenAIConfigSchema = BaseProviderConfigSchema.extend({
  type: z.literal('openai'),
  apiKey: z.string(),
  model: z.string().default('gpt-4o'),
  organization: z.string().optional(),
});

export type OpenAIConfig = z.infer<typeof OpenAIConfigSchema>;

/**
 * Anthropic-specific configuration
 */
export const AnthropicConfigSchema = BaseProviderConfigSchema.extend({
  type: z.literal('anthropic'),
  apiKey: z.string(),
  model: z.string().default('claude-3-opus-20240229'),
  version: z.string().default('2023-06-01'),
});

export type AnthropicConfig = z.infer<typeof AnthropicConfigSchema>;

/**
 * Ollama-specific configuration
 */
export const OllamaConfigSchema = BaseProviderConfigSchema.extend({
  type: z.literal('ollama'),
  model: z.string().default('llava'),
  baseURL: z.string().url().default('http://localhost:11434'),
});

export type OllamaConfig = z.infer<typeof OllamaConfigSchema>;

/**
 * Google Gemini-specific configuration
 */
export const GeminiConfigSchema = BaseProviderConfigSchema.extend({
  type: z.literal('gemini'),
  apiKey: z.string(),
  model: z.string().default('gemini-pro-vision'),
});

export type GeminiConfig = z.infer<typeof GeminiConfigSchema>;

/**
 * Union type for all provider configurations
 */
export type ProviderConfig =
  | OpenAIConfig
  | AnthropicConfig
  | OllamaConfig
  | GeminiConfig
  | BaseProviderConfig;

/**
 * SDK Configuration
 */
export const SDKConfigSchema = z.object({
  provider: z.union([
    OpenAIConfigSchema,
    AnthropicConfigSchema,
    OllamaConfigSchema,
    GeminiConfigSchema,
    BaseProviderConfigSchema,
  ]),
  naming: z
    .object({
      format: z
        .enum(['snake_case', 'kebab-case', 'camelCase', 'PascalCase', 'preserve'])
        .default('preserve'),
      maxLength: z.number().int().min(1).max(255).default(100),
      sanitize: z.boolean().default(true),
      replaceSpaces: z.string().default('_'),
      removeSpecialChars: z.boolean().default(true),
    })
    .default({}),
  batch: z
    .object({
      concurrency: z.number().int().min(1).max(100).default(5),
      chunkSize: z.number().int().min(1).max(1000).default(10),
      retryFailedItems: z.boolean().default(true),
    })
    .default({}),
  cache: z
    .object({
      enabled: z.boolean().default(true),
      ttl: z.number().int().min(0).default(3600000), // 1 hour default
      maxSize: z.number().int().min(0).default(100),
    })
    .default({}),
  logging: z
    .object({
      level: z.enum(['debug', 'info', 'warn', 'error', 'silent']).default('info'),
      format: z.enum(['json', 'pretty']).default('pretty'),
    })
    .default({}),
});

export type SDKConfig = z.infer<typeof SDKConfigSchema>;

/**
 * Partial SDK configuration for updates
 */
export type PartialSDKConfig = Partial<SDKConfig>;

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  valid: boolean;
  errors?: Array<{
    path: string;
    message: string;
  }>;
  warnings?: Array<{
    path: string;
    message: string;
  }>;
}
