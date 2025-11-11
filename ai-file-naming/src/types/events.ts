/**
 * Event types for the AI File Naming SDK
 */

import { NamingRequest, NamingResponse, NamingError } from './naming';
import { FileAnalysisResult } from './file';

/**
 * Event names
 */
export enum EventName {
  // File events
  FileAnalysisStart = 'file:analysis:start',
  FileAnalysisComplete = 'file:analysis:complete',
  FileAnalysisError = 'file:analysis:error',

  // Naming events
  NamingStart = 'naming:start',
  NamingComplete = 'naming:complete',
  NamingError = 'naming:error',
  NamingRetry = 'naming:retry',

  // Batch events
  BatchStart = 'batch:start',
  BatchProgress = 'batch:progress',
  BatchComplete = 'batch:complete',
  BatchError = 'batch:error',

  // Provider events
  ProviderRequest = 'provider:request',
  ProviderResponse = 'provider:response',
  ProviderError = 'provider:error',
  ProviderRateLimit = 'provider:ratelimit',

  // System events
  ConfigUpdate = 'config:update',
  CacheHit = 'cache:hit',
  CacheMiss = 'cache:miss',
  Error = 'error',
}

/**
 * Base event data
 */
export interface BaseEvent {
  timestamp: Date;
  eventId: string;
}

/**
 * File analysis events
 */
export interface FileAnalysisStartEvent extends BaseEvent {
  filePath: string;
  fileSize: number;
}

export interface FileAnalysisCompleteEvent extends BaseEvent {
  filePath: string;
  result: FileAnalysisResult;
  duration: number;
}

export interface FileAnalysisErrorEvent extends BaseEvent {
  filePath: string;
  error: Error;
}

/**
 * Naming events
 */
export interface NamingStartEvent extends BaseEvent {
  request: NamingRequest;
  provider: string;
}

export interface NamingCompleteEvent extends BaseEvent {
  request: NamingRequest;
  response: NamingResponse;
  duration: number;
}

export interface NamingErrorEvent extends BaseEvent {
  request: NamingRequest;
  error: NamingError;
}

export interface NamingRetryEvent extends BaseEvent {
  request: NamingRequest;
  attempt: number;
  maxAttempts: number;
  reason: string;
}

/**
 * Batch events
 */
export interface BatchStartEvent extends BaseEvent {
  totalFiles: number;
  mode: 'batch' | 'semantic-batch';
}

export interface BatchProgressEvent extends BaseEvent {
  processed: number;
  total: number;
  successful: number;
  failed: number;
  currentFile?: string;
}

export interface BatchCompleteEvent extends BaseEvent {
  totalFiles: number;
  successful: number;
  failed: number;
  duration: number;
  results: NamingResponse[];
}

export interface BatchErrorEvent extends BaseEvent {
  error: Error;
  failedFiles?: string[];
}

/**
 * Provider events
 */
export interface ProviderRequestEvent extends BaseEvent {
  provider: string;
  model?: string;
  prompt: string;
  tokens?: number;
}

export interface ProviderResponseEvent extends BaseEvent {
  provider: string;
  model?: string;
  response: unknown;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  duration: number;
}

export interface ProviderErrorEvent extends BaseEvent {
  provider: string;
  error: Error;
  retryable: boolean;
}

export interface ProviderRateLimitEvent extends BaseEvent {
  provider: string;
  resetAt?: Date;
  retryAfter?: number;
}

/**
 * System events
 */
export interface ConfigUpdateEvent extends BaseEvent {
  changes: Record<string, unknown>;
}

export interface CacheEvent extends BaseEvent {
  key: string;
  hit: boolean;
}

export interface ErrorEvent extends BaseEvent {
  error: Error;
  context?: unknown;
}

/**
 * Event handler type
 */
export type EventHandler<T = unknown> = (event: T) => void | Promise<void>;

/**
 * Event listener configuration
 */
export interface EventListenerConfig {
  once?: boolean;
  async?: boolean;
  priority?: number;
}

/**
 * Event emitter interface
 */
export interface IEventEmitter {
  on<T>(event: EventName, handler: EventHandler<T>, config?: EventListenerConfig): void;
  off<T>(event: EventName, handler: EventHandler<T>): void;
  emit<T>(event: EventName, data: T): void;
  removeAllListeners(event?: EventName): void;
}
