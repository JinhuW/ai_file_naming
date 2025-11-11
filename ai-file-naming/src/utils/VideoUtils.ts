/**
 * Video utility functions
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { prepareImage } from './FileUtils';
import { PreparedImage } from '../types/provider';

const execAsync = promisify(exec);

/**
 * Video frame extraction options
 */
export interface FrameExtractionOptions {
  count?: number; // Number of frames to extract
  fps?: number; // Frames per second
  timestamps?: string[]; // Specific timestamps (e.g., '00:00:05')
  width?: number;
  height?: number;
  format?: 'jpeg' | 'png';
  quality?: number;
}

/**
 * Extracted frame information
 */
export interface ExtractedFrame {
  framePath: string;
  timestamp: string;
  index: number;
}

/**
 * Video metadata
 */
export interface VideoInfo {
  duration: number; // in seconds
  width: number;
  height: number;
  fps: number;
  codec?: string;
  bitrate?: number;
  format?: string;
  hasAudio: boolean;
}

/**
 * Check if ffmpeg is installed
 */
export async function isFfmpegInstalled(): Promise<boolean> {
  try {
    await execAsync('ffmpeg -version');
    return true;
  } catch {
    return false;
  }
}

/**
 * Get video information using ffprobe
 */
export async function getVideoInfo(videoPath: string): Promise<VideoInfo> {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`,
    );

    const data = JSON.parse(stdout) as {
      streams?: Array<{
        codec_type?: string;
        r_frame_rate?: string;
        width?: string | number;
        height?: string | number;
        codec_name?: string;
      }>;
      format?: {
        duration?: string;
        bit_rate?: string;
        format_name?: string;
      };
    };

    // Find video stream
    const videoStream = data.streams?.find((s) => s.codec_type === 'video');
    const audioStream = data.streams?.find((s) => s.codec_type === 'audio');

    if (!videoStream) {
      throw new Error('No video stream found in file');
    }

    // Parse frame rate
    const fpsStr = videoStream.r_frame_rate ?? '30/1';
    const [num, den] = fpsStr.split('/').map(Number);
    const fps = (num ?? 30) / (den ?? 1);

    return {
      duration: parseFloat(data.format?.duration ?? '0'),
      width: parseInt(String(videoStream.width ?? '0'), 10),
      height: parseInt(String(videoStream.height ?? '0'), 10),
      fps,
      codec: videoStream.codec_name,
      bitrate: parseInt(data.format?.bit_rate ?? '0', 10),
      format: data.format?.format_name,
      hasAudio: !!audioStream,
    };
  } catch (error) {
    throw new Error(
      `Failed to get video info: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Extract frames from video
 */
export async function extractFrames(
  videoPath: string,
  options?: FrameExtractionOptions,
): Promise<ExtractedFrame[]> {
  // Check if ffmpeg is installed
  if (!(await isFfmpegInstalled())) {
    throw new Error('ffmpeg is not installed. Install it to process videos.');
  }

  const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'video-frames-'));
  const frames: ExtractedFrame[] = [];

  try {
    const videoInfo = await getVideoInfo(videoPath);
    const frameCount = options?.count ?? 3;
    const format = options?.format ?? 'jpeg';
    const quality = options?.quality ?? 80;

    // Calculate timestamps for evenly distributed frames
    const timestamps: string[] = [];

    if (options?.timestamps) {
      timestamps.push(...options.timestamps);
    } else {
      // Extract frames at regular intervals
      const interval = videoInfo.duration / (frameCount + 1);
      for (let i = 1; i <= frameCount; i++) {
        const seconds = interval * i;
        timestamps.push(formatTimestamp(seconds));
      }
    }

    // Extract each frame
    for (let i = 0; i < timestamps.length; i++) {
      const timestamp = timestamps[i]!;
      const outputPath = path.join(outputDir, `frame_${i}.${format}`);

      // Build ffmpeg command
      let command = `ffmpeg -ss ${timestamp} -i "${videoPath}" -vframes 1`;

      if (options?.width ?? options?.height) {
        const scale = `scale=${options.width ?? -1}:${options.height ?? -1}`;
        command += ` -vf "${scale}"`;
      }

      if (format === 'jpeg') {
        command += ` -q:v ${Math.round((100 - quality) / 10)}`;
      }

      command += ` "${outputPath}"`;

      // Execute ffmpeg
      await execAsync(command);

      // Verify frame was created
      try {
        await fs.access(outputPath);
        frames.push({
          framePath: outputPath,
          timestamp,
          index: i,
        });
      } catch {
        console.warn(`Failed to extract frame at ${timestamp}`);
      }
    }

    return frames;
  } catch (error) {
    // Clean up temp directory
    await fs.rm(outputDir, { recursive: true, force: true });
    throw new Error(
      `Failed to extract frames: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Extract and prepare frames for AI analysis
 */
export async function prepareVideoFrames(
  videoPath: string,
  options?: FrameExtractionOptions,
): Promise<PreparedImage[]> {
  const frames = await extractFrames(videoPath, options);
  const preparedImages: PreparedImage[] = [];

  try {
    for (const frame of frames) {
      const prepared = await prepareImage(frame.framePath, {
        maxWidth: options?.width ?? 1024,
        maxHeight: options?.height ?? 1024,
        format: 'jpeg',
        quality: options?.quality ?? 80,
      });

      preparedImages.push(prepared);
    }

    return preparedImages;
  } finally {
    // Clean up frame files
    for (const frame of frames) {
      try {
        await fs.unlink(frame.framePath);
      } catch {
        // Ignore cleanup errors
      }
    }

    // Try to remove temp directory
    try {
      const tempDir = path.dirname(frames[0]?.framePath ?? '');
      await fs.rmdir(tempDir);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Format seconds to timestamp
 */
export function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

/**
 * Generate video thumbnail
 */
export async function generateThumbnail(
  videoPath: string,
  outputPath: string,
  timestamp?: string,
): Promise<string> {
  if (!(await isFfmpegInstalled())) {
    throw new Error('ffmpeg is not installed. Install it to process videos.');
  }

  const ts = timestamp ?? '00:00:01'; // Default to 1 second in

  const command = `ffmpeg -ss ${ts} -i "${videoPath}" -vframes 1 -q:v 2 "${outputPath}"`;

  await execAsync(command);

  // Verify thumbnail was created
  await fs.access(outputPath);

  return outputPath;
}
