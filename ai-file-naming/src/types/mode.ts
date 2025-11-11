/**
 * Mode-related types for the AI File Naming SDK
 */

import { NamingOptions, BatchNamingOptions } from './naming';

/**
 * Processing mode type
 */
export type ProcessingMode = 'single' | 'batch' | 'semantic-batch';

/**
 * Base mode configuration
 */
export interface BaseModeConfig {
  name: string;
  description?: string;
  enabled: boolean;
}

/**
 * Single file mode configuration
 */
export interface SingleFileModeConfig extends BaseModeConfig {
  type: 'single';
  options?: NamingOptions;
}

/**
 * Batch mode configuration
 */
export interface BatchModeConfig extends BaseModeConfig {
  type: 'batch';
  options?: BatchNamingOptions;
  concurrency?: number;
  chunkSize?: number;
}

/**
 * Semantic batch mode configuration
 */
export interface SemanticBatchModeConfig extends BaseModeConfig {
  type: 'semantic-batch';
  options?: BatchNamingOptions;
  groupingStrategy?: 'similarity' | 'type' | 'directory' | 'custom';
  similarityThreshold?: number; // 0-1
  maxGroupSize?: number;
}

/**
 * Union type for all mode configurations
 */
export type ModeConfig = SingleFileModeConfig | BatchModeConfig | SemanticBatchModeConfig;

/**
 * Mode execution context
 */
export interface ModeExecutionContext {
  mode: ProcessingMode;
  config: ModeConfig;
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: {
    current: number;
    total: number;
    percentage: number;
  };
  error?: Error;
}

/**
 * Mode capabilities
 */
export interface ModeCapabilities {
  supportsConcurrency: boolean;
  supportsGrouping: boolean;
  supportsStreaming: boolean;
  supportsCancel: boolean;
  maxFiles?: number;
}

/**
 * Mode validation result
 */
export interface ModeValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
  suggestions?: string[];
}
