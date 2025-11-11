/**
 * File-related types for the AI File Naming SDK
 */

/**
 * File metadata information
 */
export interface FileMetadata {
  size: number;
  created: Date;
  modified: Date;
  accessed: Date;
  mimeType: string;
  extension: string;
}

/**
 * Image-specific metadata
 */
export interface ImageMetadata extends FileMetadata {
  width: number;
  height: number;
  format: string;
  colorSpace?: string;
  hasAlpha?: boolean;
  orientation?: number;
  exif?: Record<string, unknown>;
  gps?: {
    latitude: number;
    longitude: number;
    altitude?: number;
  };
}

/**
 * Video-specific metadata
 */
export interface VideoMetadata extends FileMetadata {
  duration: number; // in seconds
  width: number;
  height: number;
  fps: number;
  codec?: string;
  bitrate?: number;
  audioCodec?: string;
  audioBitrate?: number;
  audioChannels?: number;
  audioSampleRate?: number;
}

/**
 * Document-specific metadata
 */
export interface DocumentMetadata extends FileMetadata {
  pageCount?: number;
  wordCount?: number;
  author?: string;
  title?: string;
  subject?: string;
  language?: string;
  isEncrypted?: boolean;
}

/**
 * Audio-specific metadata
 */
export interface AudioMetadata extends FileMetadata {
  duration: number; // in seconds
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
  codec?: string;
  artist?: string;
  title?: string;
  album?: string;
  year?: number;
  genre?: string;
}

/**
 * File analysis result
 */
export interface FileAnalysisResult {
  filePath: string;
  fileName: string;
  fileType: FileType;
  metadata: FileMetadata | ImageMetadata | VideoMetadata | DocumentMetadata | AudioMetadata;
  content?: {
    text?: string;
    summary?: string;
    keywords?: string[];
    entities?: string[];
    sentiment?: 'positive' | 'negative' | 'neutral';
  };
  thumbnail?: Buffer;
  preview?: string;
  hash?: string;
}

/**
 * Supported file types
 */
export enum FileType {
  Image = 'image',
  Video = 'video',
  Audio = 'audio',
  Document = 'document',
  Code = 'code',
  Archive = 'archive',
  Unknown = 'unknown',
}

/**
 * File processing context
 */
export interface FileContext {
  filePath: string;
  analysis: FileAnalysisResult;
  originalName: string;
  directory: string;
  siblings?: string[]; // Other files in the same directory
  customData?: Record<string, unknown>;
}

/**
 * File validation result
 */
export interface FileValidationResult {
  valid: boolean;
  readable: boolean;
  supported: boolean;
  errors?: string[];
  warnings?: string[];
}

/**
 * File processing options
 */
export interface FileProcessingOptions {
  analyzeContent?: boolean;
  extractMetadata?: boolean;
  generateThumbnail?: boolean;
  includeHash?: boolean;
  maxFileSize?: number;
  supportedTypes?: FileType[];
}
