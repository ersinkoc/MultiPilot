/**
 * Structured logging utility for MultiPilot
 * Provides consistent log formatting with JSON output support
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
export type LogSource = 'agent' | 'sidecar' | 'frontend' | 'tauri' | 'acp' | 'system';

export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  source: LogSource;
  message: string;
  details?: Record<string, unknown>;
  agentId?: string;
  projectId?: string;
  correlationId?: string;
  duration?: number;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

export interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableStructured: boolean;
  source: LogSource;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

class StructuredLogger {
  private config: LoggerConfig;
  private correlationId: string | null = null;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      minLevel: 'info',
      enableConsole: true,
      enableStructured: true,
      source: 'system',
      ...config,
    };
  }

  setCorrelationId(id: string | null): void {
    this.correlationId = id;
  }

  setMinLevel(level: LogLevel): void {
    this.config.minLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.config.minLevel];
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private createEntry(
    level: LogLevel,
    message: string,
    details?: Record<string, unknown>,
    meta?: Partial<StructuredLogEntry>
  ): StructuredLogEntry {
    return {
      timestamp: this.formatTimestamp(),
      level,
      source: this.config.source,
      message,
      details,
      correlationId: this.correlationId || undefined,
      ...meta,
    };
  }

  private output(entry: StructuredLogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    if (this.config.enableStructured) {
      // Output as JSON for structured logging
      if (this.config.enableConsole) {
        const consoleMethod = {
          debug: console.debug,
          info: console.info,
          warn: console.warn,
          error: console.error,
          fatal: console.error,
        }[entry.level];

        consoleMethod(JSON.stringify(entry));
      }
    } else if (this.config.enableConsole) {
      // Output as plain text
      const consoleMethod = {
        debug: console.debug,
        info: console.info,
        warn: console.warn,
        error: console.error,
        fatal: console.error,
      }[entry.level];

      const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.source}]`;
      if (entry.details) {
        consoleMethod(prefix, entry.message, entry.details);
      } else {
        consoleMethod(prefix, entry.message);
      }
    }
  }

  debug(message: string, details?: Record<string, unknown>, meta?: Partial<StructuredLogEntry>): void {
    this.output(this.createEntry('debug', message, details, meta));
  }

  info(message: string, details?: Record<string, unknown>, meta?: Partial<StructuredLogEntry>): void {
    this.output(this.createEntry('info', message, details, meta));
  }

  warn(message: string, details?: Record<string, unknown>, meta?: Partial<StructuredLogEntry>): void {
    this.output(this.createEntry('warn', message, details, meta));
  }

  error(
    message: string,
    error?: Error | unknown,
    details?: Record<string, unknown>,
    meta?: Partial<StructuredLogEntry>
  ): void {
    const errorInfo = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : error
        ? { message: String(error) }
        : undefined;

    this.output(this.createEntry('error', message, details, {
      ...meta,
      error: errorInfo,
    }));
  }

  fatal(
    message: string,
    error?: Error | unknown,
    details?: Record<string, unknown>,
    meta?: Partial<StructuredLogEntry>
  ): void {
    const errorInfo = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : error
        ? { message: String(error) }
        : undefined;

    this.output(this.createEntry('fatal', message, details, {
      ...meta,
      error: errorInfo,
    }));
  }

  // Performance logging
  time<T>(
    label: string,
    fn: () => T | Promise<T>,
    details?: Record<string, unknown>
  ): Promise<T> | T {
    const start = performance.now();
    const result = fn();

    const logDuration = (value: T) => {
      const duration = performance.now() - start;
      this.info(`${label} completed`, { ...details, duration: `${duration.toFixed(2)}ms` }, { duration });
      return value;
    };

    if (result instanceof Promise) {
      return result.then(logDuration);
    }
    return logDuration(result);
  }

  // Create child logger with additional context
  child(additionalConfig: Partial<LoggerConfig>): StructuredLogger {
    return new StructuredLogger({
      ...this.config,
      ...additionalConfig,
    });
  }
}

// Default logger instance
export const logger = new StructuredLogger({ source: 'frontend', minLevel: 'info' });

// Performance monitoring helper
export function createPerformanceMonitor(operation: string, source: LogSource = 'frontend') {
  const start = performance.now();
  const childLogger = logger.child({ source });

  return {
    success: (details?: Record<string, unknown>) => {
      const duration = performance.now() - start;
      childLogger.info(`${operation} completed`, { ...details, durationMs: duration });
    },
    error: (error: Error | unknown, details?: Record<string, unknown>) => {
      const duration = performance.now() - start;
      childLogger.error(`${operation} failed`, error, { ...details, durationMs: duration });
    },
  };
}

// Crash reporting utility
export function reportCrash(error: Error, context?: Record<string, unknown>): void {
  logger.fatal('Application crash', error, context);

  // In production, could send to crash reporting service
  if (import.meta.env.PROD) {
    // Send to crash reporter
    // crashReporter.send({ error, context, timestamp: new Date().toISOString() });
  }
}

// Export for creating custom loggers
export { StructuredLogger };
