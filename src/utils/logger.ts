type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: unknown;
}

const isDev = process.env.NODE_ENV !== 'production';
const logs: LogEntry[] = [];
const MAX_LOGS = 500;

function createEntry(level: LogLevel, context: string, message: string, data?: unknown): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    context,
    message,
    data,
  };
}

function write(entry: LogEntry) {
  logs.push(entry);
  if (logs.length > MAX_LOGS) logs.shift();

  if (!isDev && entry.level !== 'error') return;

  const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.context}]`;
  const style: Record<LogLevel, string> = {
    debug: '\x1b[90m',
    info: '\x1b[36m',
    warn: '\x1b[33m',
    error: '\x1b[31m',
  };

  if (isDev) {
    const color = style[entry.level];
    console.log(`${color}${prefix}\x1b[0m ${entry.message}`, entry.data ?? '');
  }

  // In production send errors to monitoring (e.g. Sentry)
  if (entry.level === 'error') {
    // TODO: integrate Sentry.captureException / reportError
  }
}

export function createLogger(context: string) {
  return {
    debug: (message: string, data?: unknown) =>
      write(createEntry('debug', context, message, data)),
    info: (message: string, data?: unknown) =>
      write(createEntry('info', context, message, data)),
    warn: (message: string, data?: unknown) =>
      write(createEntry('warn', context, message, data)),
    error: (message: string, data?: unknown) =>
      write(createEntry('error', context, message, data)),
  };
}

export function getLogs(level?: LogLevel): LogEntry[] {
  return level ? logs.filter((l) => l.level === level) : [...logs];
}

export function clearLogs() {
  logs.length = 0;
}

export const logger = createLogger('App');
