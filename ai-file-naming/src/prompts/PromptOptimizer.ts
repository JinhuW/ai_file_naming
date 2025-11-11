/**
 * PromptOptimizer - Generate ultra-minimal prompts
 *
 * Reduces prompt tokens by 40-60% through:
 * - Ultra-compact system prompts (10-20 tokens)
 * - Minimal user prompts (10-30 tokens)
 * - Pattern-based prompts for batch operations
 */

export type PromptMode = 'ultra-minimal' | 'minimal' | 'standard';

export interface PromptContext {
  fileType: string;
  content?: string;
  pattern?: string;  // For batch operations
  metadata?: {
    filename?: string;
    size?: number;
    date?: string;
  };
}

export interface OptimizedPrompt {
  system: string;
  user: string;
  tokens: number;
}

export class PromptOptimizer {
  /**
   * Build optimized prompt based on mode
   */
  buildPrompt(context: PromptContext, mode: PromptMode = 'minimal'): OptimizedPrompt {
    switch (mode) {
      case 'ultra-minimal':
        return this.buildUltraMinimal(context);
      case 'minimal':
        return this.buildMinimal(context);
      case 'standard':
        return this.buildStandard(context);
      default:
        return this.buildMinimal(context);
    }
  }

  /**
   * Ultra-minimal prompts (20-40 tokens total)
   * For aggressive token optimization
   */
  private buildUltraMinimal(context: PromptContext): OptimizedPrompt {
    // System: 10 tokens
    const system = `Generate filename. snake_case. No extension.`;

    // User: 10-30 tokens
    const user = this.buildUltraMinimalUser(context);

    return {
      system,
      user,
      tokens: this.estimateTokens(system + user),
    };
  }

  /**
   * Build ultra-minimal user prompt
   */
  private buildUltraMinimalUser(context: PromptContext): string {
    const { fileType, content, pattern } = context;

    // If batch pattern exists, use it
    if (pattern) {
      return `Pattern: ${pattern}. ${fileType}. Name:`;
    }

    // Type-specific ultra-short prompts
    const templates: Record<string, string> = {
      image: `Photo: ${this.truncate(content || '', 20)}. Name:`,
      video: `Video: ${this.truncate(content || '', 20)}. Name:`,
      pdf: `PDF: ${this.truncate(content || '', 30)}. Name:`,
      document: `Doc: ${this.truncate(content || '', 30)}. Name:`,
    };

    const template = templates[fileType] || `${fileType}: ${this.truncate(content || '', 20)}. Name:`;

    return template;
  }

  /**
   * Minimal prompts (80-120 tokens total)
   * For balanced optimization
   */
  private buildMinimal(context: PromptContext): OptimizedPrompt {
    // System: 40 tokens
    const system = `Generate descriptive filename from content. Return only filename, no extension. Use snake_case format.`;

    // User: 40-80 tokens
    const user = this.buildMinimalUser(context);

    return {
      system,
      user,
      tokens: this.estimateTokens(system + user),
    };
  }

  /**
   * Build minimal user prompt
   */
  private buildMinimalUser(context: PromptContext): string {
    const { fileType, content } = context;

    const parts: string[] = [];

    // Add file type
    parts.push(`Type: ${fileType}`);

    // Add content summary
    if (content) {
      parts.push(`Content: ${this.truncate(content, 100)}`);
    }

    // Add relevant metadata
    if (context.metadata?.date) {
      parts.push(`Date: ${context.metadata.date}`);
    }

    if (context.metadata?.size && context.metadata.size > 10_000_000) {
      parts.push('Size: large');
    }

    parts.push('Suggest filename:');

    return parts.join('. ');
  }

  /**
   * Standard prompts (200+ tokens total)
   * For maximum quality
   */
  private buildStandard(context: PromptContext): OptimizedPrompt {
    // System: 120 tokens
    const system = `You are a file naming assistant that generates descriptive, organized filenames based on file content and metadata.

Rules:
- Return ONLY the filename without extension
- Use snake_case format
- Be descriptive but concise (max 50 characters)
- Include key identifying information
- No special characters except underscore`;

    // User: 80+ tokens
    const user = this.buildStandardUser(context);

    return {
      system,
      user,
      tokens: this.estimateTokens(system + user),
    };
  }

  /**
   * Build standard user prompt
   */
  private buildStandardUser(context: PromptContext): string {
    const { fileType, content, metadata } = context;

    const parts: string[] = [];

    parts.push(`File Type: ${fileType}`);

    if (metadata?.filename) {
      parts.push(`Original: ${metadata.filename}`);
    }

    if (content) {
      parts.push(`Content:\n${this.truncate(content, 500)}`);
    }

    if (metadata?.date) {
      parts.push(`Date: ${metadata.date}`);
    }

    if (metadata?.size) {
      parts.push(`Size: ${this.formatSize(metadata.size)}`);
    }

    parts.push('\nSuggest a descriptive filename:');

    return parts.join('\n');
  }

  /**
   * Build pattern-based prompt for batch operations
   */
  buildBatchPrompt(pattern: string, fileInfo: string): OptimizedPrompt {
    const system = `Apply naming pattern. snake_case. No extension.`;
    const user = `Pattern: ${pattern}\nFile: ${fileInfo}\nName:`;

    return {
      system,
      user,
      tokens: this.estimateTokens(system + user),
    };
  }

  /**
   * Truncate text to max length
   */
  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  }

  /**
   * Format file size for display
   */
  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
  }

  /**
   * Estimate token count (rough: 4 characters per token)
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Get recommended mode based on file complexity
   */
  getRecommendedMode(fileType: string, contentLength: number): PromptMode {
    // Simple files -> ultra-minimal
    if (fileType === 'document' && contentLength < 1000) {
      return 'ultra-minimal';
    }

    // Complex files -> standard
    if (fileType === 'video' || contentLength > 5000) {
      return 'standard';
    }

    // Default -> minimal
    return 'minimal';
  }
}
