/**
 * EnhancedContentAnalyzer - Deep content extraction for better AI naming
 *
 * Extracts meaningful content from various file types:
 * - Excel: Sheet names, headers, data samples
 * - Videos: Metadata, creation date, duration
 * - PDFs: Text content (already implemented)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as XLSX from 'xlsx';
import exifr from 'exifr';
import pdfParse from 'pdf-parse';

export interface EnhancedContent {
  summary: string;
  details: string[];
  keywords: string[];
  confidence: number;
}

export class EnhancedContentAnalyzer {
  /**
   * Analyze file and extract meaningful content
   */
  async analyze(filePath: string): Promise<EnhancedContent> {
    const ext = path.extname(filePath).toLowerCase();

    try {
      switch (ext) {
        case '.xlsx':
        case '.xls':
          return await this.analyzeExcel(filePath);
        case '.mov':
        case '.mp4':
        case '.avi':
          return await this.analyzeVideo(filePath);
        case '.pdf':
          return await this.analyzePDF(filePath);
        default:
          return await this.analyzeGeneric(filePath);
      }
    } catch (error) {
      return await this.analyzeGeneric(filePath);
    }
  }

  /**
   * Analyze Excel file - extract sheet names and content
   */
  private async analyzeExcel(filePath: string): Promise<EnhancedContent> {
    const workbook = XLSX.readFile(filePath);
    const details: string[] = [];
    const keywords: string[] = [];

    // Extract sheet names
    const sheetNames = workbook.SheetNames;
    details.push(`${sheetNames.length} sheets: ${sheetNames.slice(0, 3).join(', ')}${sheetNames.length > 3 ? '...' : ''}`);
    keywords.push(...sheetNames.slice(0, 3));

    // Analyze first sheet
    if (sheetNames[0]) {
      const worksheet = workbook.Sheets[sheetNames[0]];
      if (worksheet) {
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

        // Extract headers/first rows
        const firstRow = jsonData[0] as any[];
        const secondRow = jsonData[1] as any[];

        if (firstRow && firstRow.length > 0) {
          const headers = firstRow.slice(0, 5).filter(Boolean).join(', ');
          if (headers) {
            details.push(`Headers: ${headers}`);
            keywords.push(...firstRow.slice(0, 3).filter(Boolean).map(String));
          }
        }

        if (secondRow && secondRow.length > 0) {
          const firstData = secondRow.slice(0, 3).filter(Boolean).join(', ');
          if (firstData) {
            details.push(`Sample data: ${firstData}`);
          }
        }

        details.push(`${jsonData.length} rows`);
      }
    }

    const summary = `Excel workbook: ${sheetNames[0] || 'data'}. ${details.join('. ')}`;

    return {
      summary,
      details,
      keywords: keywords.filter(k => k && k.length > 0),
      confidence: 0.9,
    };
  }

  /**
   * Analyze video file - extract metadata and file info
   */
  private async analyzeVideo(filePath: string): Promise<EnhancedContent> {
    const stats = await fs.stat(filePath);
    const details: string[] = [];
    const keywords: string[] = [];

    // Extract creation date
    const createdDate = stats.birthtime.toISOString().split('T')[0];
    if (createdDate) {
      details.push(`Created: ${createdDate}`);
      keywords.push(createdDate.replace(/-/g, '_'));
    }

    // Extract file size
    const sizeMB = Math.round(stats.size / 1024 / 1024);
    details.push(`Size: ${sizeMB}MB`);

    // Try to extract video metadata
    const metadata = await exifr.parse(filePath).catch(() => null);
    if (metadata) {
      if (metadata.Title) {
        details.push(`Title: ${metadata.Title}`);
        keywords.push(metadata.Title);
      }
      if (metadata.Description) {
        details.push(`Description: ${metadata.Description}`);
      }
      if (metadata.Duration) {
        details.push(`Duration: ${Math.round(metadata.Duration)}s`);
      }
    }

    // Analyze filename for hints
    const basename = path.basename(filePath, path.extname(filePath));
    const filenameParts = basename.split(/[-_\s]/).filter(p => p.length > 2);
    if (filenameParts.length > 0 && basename !== 'test') {
      keywords.push(...filenameParts);
    }

    const summary = `Video file (${path.extname(filePath)}), ${sizeMB}MB, created ${createdDate}. ${details.join('. ')}`;

    return {
      summary,
      details,
      keywords,
      confidence: 0.7,
    };
  }

  /**
   * Analyze PDF - extract text content
   */
  private async analyzePDF(filePath: string): Promise<EnhancedContent> {
    const dataBuffer = await fs.readFile(filePath);
    const pdfData = await pdfParse(dataBuffer);

    const details: string[] = [];
    const keywords: string[] = [];

    details.push(`${pdfData.numpages} pages`);

    // Extract first 1000 characters
    const text = pdfData.text.slice(0, 1000).trim();
    const lines = text.split('\n').filter(line => line.trim().length > 0);

    // First few lines often contain title/subject
    const firstLines = lines.slice(0, 5).join(' ');
    details.push(`Content: ${firstLines.slice(0, 200)}`);

    // Extract potential keywords
    const words = text.split(/\s+/).filter(w => w.length > 4 && /^[a-zA-Z]/.test(w));
    keywords.push(...words.slice(0, 10));

    const summary = `PDF document, ${pdfData.numpages} pages. ${firstLines.slice(0, 100)}`;

    return {
      summary,
      details,
      keywords,
      confidence: 0.85,
    };
  }

  /**
   * Generic file analysis - metadata only
   */
  private async analyzeGeneric(filePath: string): Promise<EnhancedContent> {
    const stats = await fs.stat(filePath);
    const basename = path.basename(filePath, path.extname(filePath));

    return {
      summary: `File: ${basename}, modified ${stats.mtime.toISOString().split('T')[0]}`,
      details: [`Size: ${Math.round(stats.size / 1024)}KB`],
      keywords: [basename],
      confidence: 0.5,
    };
  }
}
