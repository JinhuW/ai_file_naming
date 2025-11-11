/**
 * Provider-related types for the AI File Naming SDK
 */

import { NamingRequest, NamingResponse } from './naming';

/**
 * Provider capabilities
 */
export interface ProviderCapabilities {
  supportsVision: boolean;
  supportsStreaming: boolean;
  supportsBatch: boolean;
  supportsCustomModels: boolean;
  maxTokens: number;
  maxImageSize?: number;
  maxImageCount?: number;
  supportedImageFormats?: string[];
  supportedMimeTypes?: string[];
}

/**
 * Provider status
 */
export interface ProviderStatus {
  available: boolean;
  configured: boolean;
  lastChecked?: Date;
  error?: string;
  version?: string;
}

/**
 * Provider validation result
 */
export interface ProviderValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
  capabilities?: ProviderCapabilities;
}

/**
 * Provider connection test result
 */
export interface ConnectionTestResult {
  success: boolean;
  latency?: number; // in ms
  error?: string;
  details?: Record<string, unknown>;
}

/**
 * Image preparation result
 */
export interface PreparedImage {
  data: string; // base64 encoded
  mimeType: string;
  width?: number;
  height?: number;
  size: number;
}

/**
 * Provider request context
 */
export interface ProviderRequestContext {
  request: NamingRequest;
  images?: PreparedImage[];
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

/**
 * Provider response
 */
export interface ProviderResponse extends NamingResponse {
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
  finishReason?: string;
}

/**
 * Stream chunk from provider
 */
export interface StreamChunk {
  content: string;
  isComplete: boolean;
  error?: string;
}

/**
 * Provider metrics
 */
export interface ProviderMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  totalTokensUsed: number;
  errors: Array<{
    timestamp: Date;
    error: string;
    context?: unknown;
  }>;
}

/**
 * Provider rate limit info
 */
export interface RateLimitInfo {
  requestsPerMinute?: number;
  requestsPerDay?: number;
  tokensPerMinute?: number;
  tokensPerDay?: number;
  remaining?: {
    requests?: number;
    tokens?: number;
  };
  resetAt?: Date;
}
