/**
 * ContentSampler - Extract minimal representative content from files
 *
 * This class implements front-loading strategy to minimize token usage:
 * - PDFs: First 500 words
 * - Images: Thumbnail (256px) + EXIF metadata
 * - Videos: 1-2 frames from first 10%
 * - Documents: First 500 characters
 * - Others: File metadata only
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import pdfParse from 'pdf-parse';
import exifr from 'exifr';
import sharp from 'sharp';

export interface ContentSamplerConfig {
  pdfWords?: number;      // Default: 500
  imageSize?: number;     // Default: 256px
  videoFrames?: number;   // Default: 2
  textChars?: number;     // Default: 500
}

export interface SampledContent {
  content: string | Buffer;
  type: 'text' | 'image' | 'metadata';
  tokens: number;
  extractionMethod: string;
}

export class ContentSampler {
  private config: Required<ContentSamplerConfig>;

  constructor(config: ContentSamplerConfig = {}) {
    this.config = {
      pdfWords: config.pdfWords ?? 500,
      imageSize: config.imageSize ?? 256,
      videoFrames: config.videoFrames ?? 2,
      textChars: config.textChars ?? 500,
    };
  }

  /**
   * Sample content from a file based on its type
   */
  async sample(filePath: string): Promise<SampledContent> {
    const ext = path.extname(filePath).toLowerCase();
    const fileType = this.getFileType(ext);

    try {
      switch (fileType) {
        case 'pdf':
          return await this.samplePdf(filePath);
        case 'image':
          return await this.sampleImage(filePath);
        case 'video':
          return await this.sampleVideo(filePath);
        case 'document':
          return await this.sampleDocument(filePath);
        default:
          return await this.sampleMetadata(filePath);
      }
    } catch (error) {
      // Fallback to metadata on any error
      return await this.sampleMetadata(filePath);
    }
  }

  /**
   * Sample first N words from PDF
   */
  private async samplePdf(filePath: string): Promise<SampledContent> {
    const dataBuffer = await fs.readFile(filePath);
    const pdfData = await pdfParse(dataBuffer);

    // Extract first N words
    const words = pdfData.text.split(/\s+/);
    const sampledWords = words.slice(0, this.config.pdfWords);
    const content = sampledWords.join(' ');

    return {
      content,
      type: 'text',
      tokens: Math.ceil(content.length / 4), // Rough token estimate
      extractionMethod: `PDF first ${this.config.pdfWords} words`,
    };
  }

  /**
   * Sample image with thumbnail + EXIF
   */
  private async sampleImage(filePath: string): Promise<SampledContent> {
    // Extract EXIF metadata first
    const exifData = await exifr.parse(filePath, {
      gps: true,
      pick: ['DateTimeOriginal', 'CreateDate', 'Make', 'Model',
             'GPSLatitude', 'GPSLongitude', 'ImageDescription'],
    });

    // Generate thumbnail
    const thumbnail = await sharp(filePath)
      .resize(this.config.imageSize, this.config.imageSize, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    // Combine metadata and thumbnail info
    const metadata = this.formatExifMetadata(exifData);
    const content = metadata ? `${metadata}\n[Image ${this.config.imageSize}px]` : `[Image ${this.config.imageSize}px]`;

    return {
      content: thumbnail,
      type: 'image',
      tokens: 170, // OpenAI vision tokens for 256px image (~170 tokens)
      extractionMethod: `Image thumbnail (${this.config.imageSize}px) + EXIF`,
    };
  }

  /**
   * Sample video frames (placeholder - requires ffmpeg)
   */
  private async sampleVideo(_filePath: string): Promise<SampledContent> {
    // For now, return metadata only
    // Full video frame extraction would require ffmpeg integration
    return await this.sampleMetadata(_filePath);
  }

  /**
   * Sample first N characters from text document
   */
  private async sampleDocument(filePath: string): Promise<SampledContent> {
    const content = await fs.readFile(filePath, 'utf-8');
    const sampled = content.slice(0, this.config.textChars);

    return {
      content: sampled,
      type: 'text',
      tokens: Math.ceil(sampled.length / 4),
      extractionMethod: `Document first ${this.config.textChars} characters`,
    };
  }

  /**
   * Extract file metadata only (fallback)
   */
  private async sampleMetadata(filePath: string): Promise<SampledContent> {
    const stats = await fs.stat(filePath);
    const basename = path.basename(filePath);
    const ext = path.extname(filePath);

    const metadata = {
      name: basename,
      size: stats.size,
      modified: stats.mtime.toISOString(),
      extension: ext,
    };

    return {
      content: JSON.stringify(metadata),
      type: 'metadata',
      tokens: 50, // Rough estimate for metadata
      extractionMethod: 'File metadata only',
    };
  }

  /**
   * Format EXIF metadata for prompts
   */
  private formatExifMetadata(exifData: any): string {
    if (!exifData) return '';

    const parts: string[] = [];

    if (exifData.DateTimeOriginal || exifData.CreateDate) {
      const date = exifData.DateTimeOriginal || exifData.CreateDate;
      parts.push(`Date: ${new Date(date).toISOString().split('T')[0]}`);
    }

    if (exifData.Make && exifData.Model) {
      parts.push(`Camera: ${exifData.Make} ${exifData.Model}`);
    }

    if (exifData.GPSLatitude && exifData.GPSLongitude) {
      parts.push(`GPS: ${exifData.GPSLatitude.toFixed(4)}, ${exifData.GPSLongitude.toFixed(4)}`);
    }

    if (exifData.ImageDescription) {
      parts.push(`Description: ${exifData.ImageDescription}`);
    }

    return parts.join(', ');
  }

  /**
   * Determine file type from extension
   */
  private getFileType(ext: string): string {
    const typeMap: Record<string, string> = {
      '.pdf': 'pdf',
      '.jpg': 'image',
      '.jpeg': 'image',
      '.png': 'image',
      '.gif': 'image',
      '.heic': 'image',
      '.heif': 'image',
      '.webp': 'image',
      '.mp4': 'video',
      '.avi': 'video',
      '.mov': 'video',
      '.mkv': 'video',
      '.txt': 'document',
      '.md': 'document',
      '.doc': 'document',
      '.docx': 'document',
    };

    return typeMap[ext] || 'unknown';
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ContentSamplerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<ContentSamplerConfig> {
    return { ...this.config };
  }
}
