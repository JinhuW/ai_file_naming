/**
 * Naming-related types for the AI File Naming SDK
 */

import { FileContext } from './file';

/**
 * Naming request for a single file
 */
export interface NamingRequest {
  id: string;
  context: FileContext;
  prompt?: string;
  strategy?: NamingStrategy;
  options?: NamingOptions;
}

/**
 * Naming response from AI provider
 */
export interface NamingResponse {
  id?: string;
  originalName: string;
  suggestedName: string;
  confidence: number; // 0-1 score
  reasoning?: string;
  alternatives?: string[];
  metadata?: Record<string, unknown>;
  error?: NamingError;
}

/**
 * Naming error information
 */
export interface NamingError {
  code: string;
  message: string;
  details?: unknown;
  retryable?: boolean;
}

/**
 * Naming strategy type
 */
export type NamingStrategy = 'content' | 'metadata' | 'hybrid' | 'template' | 'custom';

/**
 * Naming options
 */
export interface NamingOptions {
  includeDate?: boolean;
  includeSequence?: boolean;
  preserveExtension?: boolean;
  template?: string;
  customPrompt?: string;
  maxLength?: number;
  caseFormat?: 'snake_case' | 'kebab-case' | 'camelCase' | 'PascalCase' | 'preserve';
}

/**
 * Batch naming request
 */
export interface BatchNamingRequest {
  files: NamingRequest[];
  groupBy?: 'type' | 'directory' | 'similarity' | 'none';
  options?: BatchNamingOptions;
}

/**
 * Batch naming options
 */
export interface BatchNamingOptions extends NamingOptions {
  concurrency?: number;
  continueOnError?: boolean;
  deduplicateNames?: boolean;
  semanticGrouping?: boolean;
}

/**
 * Batch naming result
 */
export interface BatchNamingResult {
  successful: NamingResponse[];
  failed: Array<NamingResponse & { error: NamingError }>;
  totalProcessed: number;
  totalSuccess: number;
  totalFailed: number;
  duration: number;
}

/**
 * Naming mode configuration
 */
export interface NamingModeConfig {
  mode: 'single' | 'batch' | 'semantic-batch';
  strategy?: NamingStrategy;
  options?: NamingOptions | BatchNamingOptions;
}

/**
 * Naming conflict resolution
 */
export interface ConflictResolution {
  strategy: 'skip' | 'overwrite' | 'rename' | 'prompt';
  renamePattern?: string; // e.g., "{name}_{n}"
}

/**
 * Naming history entry
 */
export interface NamingHistoryEntry {
  timestamp: Date;
  originalName: string;
  newName: string;
  filePath: string;
  provider: string;
  model?: string;
  prompt?: string;
  success: boolean;
  error?: string;
}
