/**
 * File utility functions
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { createReadStream } from 'fs';
import { createHash } from 'crypto';
import { FileMetadata, FileType, FileValidationResult } from '../types/file';
import { PreparedImage } from '../types/provider';
import sharp from 'sharp';
import * as mime from 'mime-types';

/**
 * Get file metadata
 */
export async function getFileMetadata(filePath: string): Promise<FileMetadata> {
  const stats = await fs.stat(filePath);
  const extension = path.extname(filePath).toLowerCase();
  const mimeType = mime.lookup(filePath) || 'application/octet-stream';

  return {
    size: stats.size,
    created: stats.birthtime,
    modified: stats.mtime,
    accessed: stats.atime,
    mimeType,
    extension,
  };
}

/**
 * Detect file type
 */
export function detectFileType(filePath: string): FileType {
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = mime.lookup(filePath);

  // Image types
  const imageExtensions = [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.bmp',
    '.webp',
    '.svg',
    '.heic',
    '.heif',
  ];
  if (
    imageExtensions.includes(ext) ||
    (mimeType && typeof mimeType === 'string' && mimeType.startsWith('image/'))
  ) {
    return FileType.Image;
  }

  // Video types
  const videoExtensions = [
    '.mp4',
    '.avi',
    '.mkv',
    '.mov',
    '.wmv',
    '.flv',
    '.webm',
    '.m4v',
    '.mpg',
    '.mpeg',
  ];
  if (
    videoExtensions.includes(ext) ||
    (mimeType && typeof mimeType === 'string' && mimeType.startsWith('video/'))
  ) {
    return FileType.Video;
  }

  // Audio types
  const audioExtensions = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a', '.opus'];
  if (
    audioExtensions.includes(ext) ||
    (mimeType && typeof mimeType === 'string' && mimeType.startsWith('audio/'))
  ) {
    return FileType.Audio;
  }

  // Document types
  const documentExtensions = [
    '.pdf',
    '.doc',
    '.docx',
    '.txt',
    '.md',
    '.rtf',
    '.odt',
    '.xls',
    '.xlsx',
    '.ppt',
    '.pptx',
  ];
  if (
    documentExtensions.includes(ext) ||
    (mimeType &&
      typeof mimeType === 'string' &&
      (mimeType.includes('document') ||
        mimeType.includes('text/') ||
        mimeType.includes('application/pdf')))
  ) {
    return FileType.Document;
  }

  // Code types
  const codeExtensions = [
    '.js',
    '.ts',
    '.tsx',
    '.jsx',
    '.py',
    '.java',
    '.cpp',
    '.c',
    '.h',
    '.go',
    '.rs',
    '.rb',
    '.php',
    '.swift',
    '.kt',
    '.scala',
    '.r',
  ];
  if (
    codeExtensions.includes(ext) ||
    (mimeType &&
      typeof mimeType === 'string' &&
      (mimeType.includes('application/javascript') || mimeType.includes('application/json')))
  ) {
    return FileType.Code;
  }

  // Archive types
  const archiveExtensions = ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz'];
  if (
    archiveExtensions.includes(ext) ||
    (mimeType &&
      typeof mimeType === 'string' &&
      (mimeType.includes('application/zip') || mimeType.includes('compressed')))
  ) {
    return FileType.Archive;
  }

  return FileType.Unknown;
}

/**
 * Validate file
 */
export async function validateFile(
  filePath: string,
  options?: {
    maxSize?: number;
    supportedTypes?: FileType[];
  },
): Promise<FileValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Check if file exists
    const exists = await fileExists(filePath);
    if (!exists) {
      errors.push('File does not exist');
      return {
        valid: false,
        readable: false,
        supported: false,
        errors,
      };
    }

    // Check if file is readable
    try {
      await fs.access(filePath, fs.constants.R_OK);
    } catch {
      errors.push('File is not readable');
      return {
        valid: false,
        readable: false,
        supported: false,
        errors,
      };
    }

    // Get file metadata
    const metadata = await getFileMetadata(filePath);

    // Check file size
    if (options?.maxSize && metadata.size > options.maxSize) {
      errors.push(
        `File size (${formatSize(metadata.size)}) exceeds maximum allowed (${formatSize(options.maxSize)})`,
      );
    }

    // Check file type
    const fileType = detectFileType(filePath);
    let supported = true;

    if (options?.supportedTypes && !options.supportedTypes.includes(fileType)) {
      supported = false;
      warnings.push(`File type '${fileType}' is not in the list of supported types`);
    }

    // Check for empty file
    if (metadata.size === 0) {
      warnings.push('File is empty');
    }

    return {
      valid: errors.length === 0,
      readable: true,
      supported,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      valid: false,
      readable: false,
      supported: false,
      errors,
    };
  }
}

/**
 * Check if file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file hash
 */
export async function getFileHash(filePath: string, algorithm = 'sha256'): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash(algorithm);
    const stream = createReadStream(filePath);

    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Read file as buffer
 */
export async function readFileAsBuffer(filePath: string): Promise<Buffer> {
  return fs.readFile(filePath);
}

/**
 * Read file as text
 */
export async function readFileAsText(
  filePath: string,
  encoding: BufferEncoding = 'utf-8',
): Promise<string> {
  return fs.readFile(filePath, encoding);
}

/**
 * List files in directory
 */
export async function listFiles(
  dirPath: string,
  options?: {
    recursive?: boolean;
    filter?: (filePath: string) => boolean;
    includeDirectories?: boolean;
  },
): Promise<string[]> {
  const files: string[] = [];

  async function walkDir(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (options?.includeDirectories) {
          files.push(fullPath);
        }
        if (options?.recursive) {
          await walkDir(fullPath);
        }
      } else if (entry.isFile()) {
        if (options?.filter?.(fullPath) ?? true) {
          files.push(fullPath);
        }
      }
    }
  }

  await walkDir(dirPath);
  return files;
}

/**
 * Prepare image for AI provider
 */
export async function prepareImage(
  imagePath: string,
  options?: {
    maxWidth?: number;
    maxHeight?: number;
    maxSize?: number;
    format?: 'jpeg' | 'png' | 'webp';
    quality?: number;
  },
): Promise<PreparedImage> {
  try {
    let image = sharp(imagePath);
    const metadata = await image.metadata();

    // Resize if necessary
    if (options?.maxWidth ?? options?.maxHeight) {
      image = image.resize(options.maxWidth, options.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Convert format if specified
    const format = options?.format ?? 'jpeg';
    const quality = options?.quality ?? 85;

    switch (format) {
      case 'jpeg':
        image = image.jpeg({ quality });
        break;
      case 'png':
        image = image.png({ quality });
        break;
      case 'webp':
        image = image.webp({ quality });
        break;
    }

    // Convert to buffer
    const buffer = await image.toBuffer();

    // Check size and compress if necessary
    let finalBuffer = buffer;
    if (options?.maxSize && buffer.length > options.maxSize) {
      // Reduce quality until size is acceptable
      let currentQuality = quality;
      while (finalBuffer.length > options.maxSize && currentQuality > 10) {
        currentQuality -= 10;
        finalBuffer = await sharp(imagePath)
          .resize(options.maxWidth ?? undefined, options.maxHeight ?? undefined, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ quality: currentQuality })
          .toBuffer();
      }
    }

    // Convert to base64
    const base64 = finalBuffer.toString('base64');

    return {
      data: base64,
      mimeType: `image/${format}`,
      width: metadata.width,
      height: metadata.height,
      size: finalBuffer.length,
    };
  } catch (error) {
    throw new Error(
      `Failed to prepare image: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Rename file
 */
export async function renameFile(
  oldPath: string,
  newName: string,
  options?: {
    preserveExtension?: boolean;
    overwrite?: boolean;
  },
): Promise<string> {
  const dir = path.dirname(oldPath);
  const oldExt = path.extname(oldPath);

  // Construct new path
  let newFileName = newName;
  if (options?.preserveExtension !== false) {
    // Remove extension from new name if present
    newFileName = newName.replace(/\.[^.]+$/, '');
    newFileName += oldExt;
  }

  const newPath = path.join(dir, newFileName);

  // Check if target exists
  if (!options?.overwrite && (await fileExists(newPath))) {
    throw new Error(`File already exists: ${newPath}`);
  }

  // Rename file
  await fs.rename(oldPath, newPath);
  return newPath;
}

/**
 * Copy file
 */
export async function copyFile(
  sourcePath: string,
  destPath: string,
  options?: {
    overwrite?: boolean;
  },
): Promise<void> {
  // Check if destination exists
  if (!options?.overwrite && (await fileExists(destPath))) {
    throw new Error(`Destination file already exists: ${destPath}`);
  }

  // Ensure destination directory exists
  await fs.mkdir(path.dirname(destPath), { recursive: true });

  // Copy file
  await fs.copyFile(sourcePath, destPath);
}

/**
 * Get unique filename
 */
export async function getUniqueFilename(
  dirPath: string,
  baseName: string,
  extension?: string,
): Promise<string> {
  let counter = 0;
  let filename = extension ? `${baseName}${extension}` : baseName;
  let fullPath = path.join(dirPath, filename);

  while (await fileExists(fullPath)) {
    counter++;
    const nameWithoutExt = extension ? baseName : path.basename(baseName, path.extname(baseName));
    const ext = extension ?? path.extname(baseName);
    filename = `${nameWithoutExt}_${counter}${ext}`;
    fullPath = path.join(dirPath, filename);
  }

  return filename;
}

/**
 * Format file size
 */
export function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(
  filename: string,
  options?: {
    replacement?: string;
    maxLength?: number;
  },
): string {
  const replacement = options?.replacement ?? '_';
  const maxLength = options?.maxLength ?? 255;

  // Remove or replace invalid characters
  let sanitized = filename
    // Remove control characters and non-printable characters
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f\x80-\x9f]/g, replacement)
    // Replace reserved characters
    .replace(/[<>:"/\\|?*]/g, replacement)
    // Remove trailing periods and spaces
    .replace(/[\s.]+$/, '')
    // Remove leading periods and spaces
    .replace(/^[\s.]+/, '');

  // Ensure not empty
  if (!sanitized) {
    sanitized = 'unnamed';
  }

  // Truncate if too long
  if (sanitized.length > maxLength) {
    const ext = path.extname(sanitized);
    const nameWithoutExt = sanitized.slice(0, sanitized.length - ext.length);
    const maxNameLength = maxLength - ext.length;
    sanitized = nameWithoutExt.slice(0, maxNameLength) + ext;
  }

  return sanitized;
}
