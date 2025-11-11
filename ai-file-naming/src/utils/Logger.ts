/**
 * Logger utility for the SDK
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';
export type LogFormat = 'json' | 'pretty';

interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: unknown;
}

/**
 * Logger class
 */
export class Logger {
  private level: LogLevel;
  private format: LogFormat;
  private static instance: Logger;

  constructor(level: LogLevel = 'info', format: LogFormat = 'pretty') {
    this.level = level;
    this.format = format;
  }

  /**
   * Get singleton instance
   */
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Set log format
   */
  setFormat(format: LogFormat): void {
    this.format = format;
  }

  /**
   * Debug log
   */
  debug(message: string, context?: unknown): void {
    this.log('debug', message, context);
  }

  /**
   * Info log
   */
  info(message: string, context?: unknown): void {
    this.log('info', message, context);
  }

  /**
   * Warning log
   */
  warn(message: string, context?: unknown): void {
    this.log('warn', message, context);
  }

  /**
   * Error log
   */
  error(message: string, context?: unknown): void {
    this.log('error', message, context);
  }

  /**
   * Log message
   */
  private log(level: LogLevel, message: string, context?: unknown): void {
    if (this.shouldLog(level)) {
      const entry: LogEntry = {
        timestamp: new Date(),
        level,
        message,
        context,
      };

      if (this.format === 'json') {
        this.logJson(entry);
      } else {
        this.logPretty(entry);
      }
    }
  }

  /**
   * Check if should log based on level
   */
  private shouldLog(level: LogLevel): boolean {
    if (this.level === 'silent') return false;

    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.level);
    const messageLevelIndex = levels.indexOf(level);

    return messageLevelIndex >= currentLevelIndex;
  }

  /**
   * Log in JSON format
   */
  private logJson(entry: LogEntry): void {
    const output = JSON.stringify({
      ...entry,
      timestamp: entry.timestamp.toISOString(),
    });

    this.output(entry.level, output);
  }

  /**
   * Log in pretty format
   */
  private logPretty(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const levelColor = this.getLevelColor(entry.level);
    const levelText = entry.level.toUpperCase().padEnd(5);

    let output = `${timestamp} ${levelColor}[${levelText}]${this.reset()} ${entry.message}`;

    if (entry.context) {
      if (typeof entry.context === 'object') {
        output += '\n' + JSON.stringify(entry.context, null, 2);
      } else {
        output += ' ' + String(entry.context);
      }
    }

    this.output(entry.level, output);
  }

  /**
   * Get color for log level
   */
  private getLevelColor(level: LogLevel): string {
    if (process.env['NO_COLOR'] ?? !process.stdout.isTTY) {
      return '';
    }

    switch (level) {
      case 'debug':
        return '\x1b[36m'; // Cyan
      case 'info':
        return '\x1b[32m'; // Green
      case 'warn':
        return '\x1b[33m'; // Yellow
      case 'error':
        return '\x1b[31m'; // Red
      default:
        return '';
    }
  }

  /**
   * Reset color
   */
  private reset(): string {
    if (process.env['NO_COLOR'] ?? !process.stdout.isTTY) {
      return '';
    }
    return '\x1b[0m';
  }

  /**
   * Output to console
   */
  private output(level: LogLevel, message: string): void {
    // Console statements are intentional here - this is the logger output
    /* eslint-disable no-console */
    if (level === 'error') {
      console.error(message);
    } else if (level === 'warn') {
      console.warn(message);
    } else {
      console.log(message);
    }
    /* eslint-enable no-console */
  }

  /**
   * Create child logger with context
   */
  child(context: Record<string, unknown>): ChildLogger {
    return new ChildLogger(this, context);
  }
}

/**
 * Child logger with persistent context
 */
export class ChildLogger {
  private parent: Logger;
  private context: Record<string, unknown>;

  constructor(parent: Logger, context: Record<string, unknown>) {
    this.parent = parent;
    this.context = context;
  }

  debug(message: string, additionalContext?: unknown): void {
    const context =
      typeof additionalContext === 'object' && additionalContext !== null
        ? { ...this.context, ...additionalContext }
        : this.context;
    this.parent.debug(message, context);
  }

  info(message: string, additionalContext?: unknown): void {
    const context =
      typeof additionalContext === 'object' && additionalContext !== null
        ? { ...this.context, ...additionalContext }
        : this.context;
    this.parent.info(message, context);
  }

  warn(message: string, additionalContext?: unknown): void {
    const context =
      typeof additionalContext === 'object' && additionalContext !== null
        ? { ...this.context, ...additionalContext }
        : this.context;
    this.parent.warn(message, context);
  }

  error(message: string, additionalContext?: unknown): void {
    const context =
      typeof additionalContext === 'object' && additionalContext !== null
        ? { ...this.context, ...additionalContext }
        : this.context;
    this.parent.error(message, context);
  }
}

// Export default logger instance
export const logger = Logger.getInstance();
