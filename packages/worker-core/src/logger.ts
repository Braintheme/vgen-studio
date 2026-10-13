export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export interface Logger {
  debug(message: string, fields?: Record<string, unknown>): void;
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
  child(fields: Record<string, unknown>): Logger;
}

const serializeError = (value: unknown): unknown =>
  value instanceof Error ? { name: value.name, message: value.message, stack: value.stack } : value;

/** Minimal structured logger: one JSON object per line on stdout. */
export const createLogger = (base: Record<string, unknown>, level: LogLevel = 'info'): Logger => {
  const write =
    (entryLevel: LogLevel) =>
    (message: string, fields: Record<string, unknown> = {}): void => {
      if (ORDER[entryLevel] < ORDER[level]) {
        return;
      }
      const entry = Object.fromEntries(
        Object.entries({
          time: new Date().toISOString(),
          level: entryLevel,
          ...base,
          message,
          ...fields,
        }).map(([key, value]) => [key, serializeError(value)]),
      );
      process.stdout.write(`${JSON.stringify(entry)}\n`);
    };
  return {
    debug: write('debug'),
    info: write('info'),
    warn: write('warn'),
    error: write('error'),
    child: (fields) => createLogger({ ...base, ...fields }, level),
  };
};
