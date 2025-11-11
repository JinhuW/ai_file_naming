/**
 * MetadataExtractor - Zero-token naming from file metadata
 *
 * This class attempts to generate file names purely from metadata,
 * avoiding API calls entirely for obvious cases like:
 * - Screenshots with timestamps
 * - Photos with GPS + date EXIF data
 * - Documents with clear titles
 * - Downloads with descriptive names
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import exifr from 'exifr';

export interface MetadataScore {
  confidence: number;  // 0-1
  suggestedName: string;
  reasoning: string;
}

export interface RichMetadata {
  originalName: string;
  extension: string;
  size: number;
  modified: Date;
  exif?: {
    dateTime?: Date;
    gps?: { latitude: number; longitude: number };
    camera?: string;
    description?: string;
  };
  patterns?: {
    hasSequenceNumber: boolean;
    hasDatePattern: boolean;
    hasDescriptiveText: boolean;
    isScreenshot: boolean;
    isDownload: boolean;
  };
}

export class MetadataExtractor {
  /**
   * Check if file can be named from metadata alone
   */
  async canNameFromMetadata(filePath: string): Promise<MetadataScore> {
    const metadata = await this.extractRichMetadata(filePath);
    const confidence = this.calculateConfidence(metadata);

    if (confidence >= 0.5) {
      const suggestedName = this.generateNameFromMetadata(metadata);
      const reasoning = this.explainConfidence(metadata);

      return {
        confidence,
        suggestedName,
        reasoning,
      };
    }

    return {
      confidence,
      suggestedName: '',
      reasoning: 'Insufficient metadata for confident naming',
    };
  }

  /**
   * Extract comprehensive metadata from file
   */
  async extractRichMetadata(filePath: string): Promise<RichMetadata> {
    const stats = await fs.stat(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const basename = path.basename(filePath, ext);

    const metadata: RichMetadata = {
      originalName: basename,
      extension: ext,
      size: stats.size,
      modified: stats.mtime,
    };

    // Extract EXIF for images
    if (this.isImage(ext)) {
      metadata.exif = await this.extractExif(filePath);
    }

    // Detect patterns in filename
    metadata.patterns = this.detectPatterns(basename);

    return metadata;
  }

  /**
   * Extract EXIF data from image
   */
  private async extractExif(filePath: string): Promise<RichMetadata['exif'] | undefined> {
    try {
      const exifData = await exifr.parse(filePath, {
        gps: true,
        pick: ['DateTimeOriginal', 'CreateDate', 'Make', 'Model',
               'GPSLatitude', 'GPSLongitude', 'ImageDescription'],
      });

      if (!exifData) return undefined;

      const result: RichMetadata['exif'] = {};

      // Extract date
      if (exifData.DateTimeOriginal || exifData.CreateDate) {
        result.dateTime = new Date(exifData.DateTimeOriginal || exifData.CreateDate);
      }

      // Extract GPS
      if (exifData.GPSLatitude && exifData.GPSLongitude) {
        result.gps = {
          latitude: exifData.GPSLatitude,
          longitude: exifData.GPSLongitude,
        };
      }

      // Extract camera info
      if (exifData.Make && exifData.Model) {
        result.camera = `${exifData.Make} ${exifData.Model}`.replace(/\s+/g, '_').toLowerCase();
      }

      // Extract description
      if (exifData.ImageDescription) {
        result.description = exifData.ImageDescription;
      }

      return result;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Detect patterns in filename
   */
  private detectPatterns(filename: string): RichMetadata['patterns'] {
    const lower = filename.toLowerCase();

    return {
      hasSequenceNumber: /\d{3,}/.test(filename),
      hasDatePattern: /\d{4}[-_]?\d{2}[-_]?\d{2}/.test(filename) || /\d{8}/.test(filename),
      hasDescriptiveText: /[a-z]{4,}/i.test(filename.replace(/\d+/g, '')),
      isScreenshot: /screenshot|screen.?shot|capture/i.test(lower),
      isDownload: /download/i.test(lower) || /\(\d+\)/.test(filename), // e.g., file(1).pdf
    };
  }

  /**
   * Calculate confidence score for metadata-based naming
   */
  private calculateConfidence(metadata: RichMetadata): number {
    let score = 0;

    // Screenshot with date pattern = very high confidence (0.95)
    if (metadata.patterns?.isScreenshot && metadata.patterns?.hasDatePattern) {
      return 0.95;
    }

    // EXIF GPS + Date = very high confidence (0.9)
    if (metadata.exif?.gps && metadata.exif?.dateTime) {
      score += 0.9;
      return score;
    }

    // EXIF Date + descriptive name = high confidence (0.8)
    if (metadata.exif?.dateTime && metadata.patterns?.hasDescriptiveText) {
      score += 0.8;
      return score;
    }

    // EXIF Date only = medium confidence (0.65)
    if (metadata.exif?.dateTime) {
      score += 0.65;
      return score;
    }

    // Descriptive filename + date pattern = medium confidence (0.6)
    if (metadata.patterns?.hasDescriptiveText && metadata.patterns?.hasDatePattern) {
      score += 0.6;
      return score;
    }

    // File timestamp + descriptive text = low-medium confidence (0.5)
    if (metadata.patterns?.hasDescriptiveText) {
      score += 0.5;
      return score;
    }

    // Below threshold
    return 0.3;
  }

  /**
   * Generate filename from metadata
   */
  private generateNameFromMetadata(metadata: RichMetadata): string {
    const parts: string[] = [];

    // Handle screenshots specially
    if (metadata.patterns?.isScreenshot) {
      parts.push('screenshot');

      // Extract date from filename if present
      const dateMatch = metadata.originalName.match(/(\d{4})[-_]?(\d{2})[-_]?(\d{2})/);
      if (dateMatch) {
        parts.push(`${dateMatch[1]}_${dateMatch[2]}_${dateMatch[3]}`);
      } else if (metadata.exif?.dateTime) {
        const date = metadata.exif.dateTime;
        parts.push(`${date.getFullYear()}_${String(date.getMonth() + 1).padStart(2, '0')}_${String(date.getDate()).padStart(2, '0')}`);
      } else {
        const date = metadata.modified;
        parts.push(`${date.getFullYear()}_${String(date.getMonth() + 1).padStart(2, '0')}_${String(date.getDate()).padStart(2, '0')}`);
      }

      // Extract time if present
      const timeMatch = metadata.originalName.match(/(\d{2})[-_]?(\d{2})[-_]?(\d{2})/);
      if (timeMatch && !dateMatch) {
        parts.push(`${timeMatch[1]}${timeMatch[2]}${timeMatch[3]}`);
      }

      return parts.join('_');
    }

    // Add date from EXIF or file timestamp
    if (metadata.exif?.dateTime) {
      const date = metadata.exif.dateTime;
      parts.push(`${date.getFullYear()}_${String(date.getMonth() + 1).padStart(2, '0')}_${String(date.getDate()).padStart(2, '0')}`);
    } else {
      const date = metadata.modified;
      parts.push(`${date.getFullYear()}_${String(date.getMonth() + 1).padStart(2, '0')}_${String(date.getDate()).padStart(2, '0')}`);
    }

    // Add descriptive text from original filename if present
    if (metadata.patterns?.hasDescriptiveText && metadata.originalName) {
      // Extract descriptive words (remove numbers, dates, etc.)
      const descriptive = metadata.originalName
        .replace(/\d{4}[-_]?\d{2}[-_]?\d{2}/g, '') // Remove dates
        .replace(/\d{6,}/g, '') // Remove long number sequences
        .replace(/IMG_|DSC_|DCIM_/gi, '') // Remove camera prefixes
        .replace(/[^a-z0-9]+/gi, '_') // Replace special chars
        .replace(/_+/g, '_') // Collapse multiple underscores
        .replace(/^_|_$/g, '') // Trim underscores
        .toLowerCase();

      if (descriptive && descriptive.length >= 3) {
        parts.push(descriptive.slice(0, 30)); // Limit length
      }
    }

    // Add file type hint
    const fileType = this.getFileTypeHint(metadata.extension);
    if (fileType) {
      parts.push(fileType);
    }

    // Add sequence number if present
    if (metadata.patterns?.hasSequenceNumber && metadata.originalName) {
      const match = metadata.originalName.match(/(\d{3,})/);
      if (match && match[1]) {
        parts.push(match[1]);
      }
    }

    // Fallback: use sanitized original name
    if (parts.length === 0 && metadata.originalName) {
      return this.sanitize(metadata.originalName);
    }

    return parts.length > 0 ? parts.join('_') : 'file';
  }

  /**
   * Get file type hint for naming
   */
  private getFileTypeHint(ext: string): string {
    const typeMap: Record<string, string> = {
      '.jpg': 'photo',
      '.jpeg': 'photo',
      '.png': 'image',
      '.pdf': 'doc',
      '.txt': 'text',
      '.md': 'note',
    };

    return typeMap[ext] || '';
  }

  /**
   * Explain confidence score
   */
  private explainConfidence(metadata: RichMetadata): string {
    const reasons: string[] = [];

    if (metadata.patterns?.isScreenshot) {
      reasons.push('Screenshot pattern detected');
    }

    if (metadata.exif?.gps && metadata.exif?.dateTime) {
      reasons.push('GPS location and date from EXIF');
    } else if (metadata.exif?.dateTime) {
      reasons.push('Date from EXIF');
    }

    if (metadata.patterns?.hasDescriptiveText) {
      reasons.push('Descriptive filename pattern');
    }

    if (metadata.patterns?.hasDatePattern) {
      reasons.push('Date pattern in filename');
    }

    return reasons.join(', ') || 'Basic file metadata';
  }

  /**
   * Check if file is an image
   */
  private isImage(ext: string): boolean {
    return ['.jpg', '.jpeg', '.png', '.gif', '.heic', '.heif', '.webp'].includes(ext);
  }

  /**
   * Sanitize filename
   */
  private sanitize(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }
}
