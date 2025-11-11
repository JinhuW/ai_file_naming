/**
 * Analyzer-related types for the AI File Naming SDK
 */

/**
 * Analyzer capabilities
 */
export interface AnalyzerCapabilities {
  supportedExtensions: string[];
  supportedMimeTypes: string[];
  maxFileSize?: number;
  requiresExternalDependency?: boolean;
  canExtractText: boolean;
  canExtractMetadata: boolean;
  canGenerateThumbnail: boolean;
  canAnalyzeContent: boolean;
}

/**
 * Analyzer configuration
 */
export interface AnalyzerConfig {
  name: string;
  priority: number; // Higher priority analyzers are tried first
  enabled: boolean;
  options?: Record<string, unknown>;
}

/**
 * Analyzer validation result
 */
export interface AnalyzerValidationResult {
  valid: boolean;
  canAnalyze: boolean;
  reason?: string;
  suggestions?: string[];
}

/**
 * Content extraction options
 */
export interface ContentExtractionOptions {
  maxLength?: number;
  extractText?: boolean;
  extractMetadata?: boolean;
  extractEntities?: boolean;
  extractKeywords?: boolean;
  ocrEnabled?: boolean;
}

/**
 * Thumbnail generation options
 */
export interface ThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number; // 0-100
  format?: 'jpeg' | 'png' | 'webp';
  preserveAspectRatio?: boolean;
}

/**
 * Text extraction result
 */
export interface TextExtractionResult {
  text: string;
  language?: string;
  encoding?: string;
  confidence?: number; // For OCR results
}

/**
 * Entity extraction result
 */
export interface EntityExtractionResult {
  people?: string[];
  places?: string[];
  organizations?: string[];
  dates?: string[];
  custom?: Record<string, string[]>;
}

/**
 * Analyzer statistics
 */
export interface AnalyzerStats {
  filesAnalyzed: number;
  successCount: number;
  errorCount: number;
  averageProcessingTime: number;
  lastUsed?: Date;
}

/**
 * Analyzer error
 */
export interface AnalyzerError {
  code: string;
  message: string;
  analyzer: string;
  filePath?: string;
  details?: unknown;
  recoverable?: boolean;
}
