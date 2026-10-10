import * as fs from 'fs';
import * as path from 'path';

/**
 * The base directory path where log files will be stored.
 * It is set to two levels up from the current directory.
 */
const homeDirPath: string = path.join(__dirname, '../../');

/** Log directory: `LOG_DIR` when set (read per write), else the repo root. */
function logDir(): string {
  return process.env.LOG_DIR ? `${path.resolve(process.env.LOG_DIR)}${path.sep}` : homeDirPath;
}

/**
 * Keys never written to any log. An Axios error carries the request config
 * and the raw request (`config.headers`, `request._header`), which hold
 * provider API keys; `AxiosError.toJSON()` includes `config` too.
 */
const SENSITIVE_KEYS = new Set(['config', 'request', 'headers', '_header']);

/** JSON.stringify that drops SENSITIVE_KEYS at any depth (after toJSON). */
function safeStringify(value: any): string {
  return JSON.stringify(value, (key, v) => (SENSITIVE_KEYS.has(key) ? undefined : v));
}

/**
 * Log-safe one-liner for an Axios error: message (or code, when Node raised
 * an empty-message AggregateError), method, URL path without query, status.
 */
function describeAxiosError(err: any): string {
  const method = String(err.config?.method ?? '').toUpperCase();
  const url = `${err.config?.baseURL ?? ''}${String(err.config?.url ?? '').split('?')[0]}`;
  const status = err.response?.status ?? err.code ?? 'no response';
  return `AxiosError: ${err.message || err.code || 'request failed'} [${method} ${url}] status=${status}`;
}

/**
 * Retrieves the size of a file in bytes.
 *
 * @param filename - The path to the file.
 * @returns The size of the file in bytes. Returns `0` if the file does not exist or an error occurs.
 *
 * @example
 * ```typescript
 * const size = getFilesizeInBytes('/path/to/file.txt');
 * console.log(`File size: ${size} bytes`);
 * ```
 */
function getFilesizeInBytes(filename: string): number {
  try {
    const stats = fs.statSync(filename);
    const fileSizeInBytes: number = stats.size;
    return fileSizeInBytes;
  } catch (e) {
    console.log(e);
    return 0;
  }
}

/**
 * Ensures that the provided parameter is a string.
 * If the parameter is not a string, it converts it to a JSON string.
 *
 * @param parameter - The value to ensure as a string.
 * @returns The parameter as a string.
 *
 * @example
 * ```typescript
 * const str = ensureString({ key: 'value' });
 * console.log(str); // Output: '{"key":"value"}'
 * ```
 */
function ensureString(parameter: any): string {
  return typeof parameter === 'string' ? parameter : JSON.stringify(parameter);
}

/**
 * Writes a message to a log file. If the file exceeds 25MB, it rewrites the file.
 *
 * @param filepath - The path to the log file.
 * @param args - The message or an object containing `message` and `stack` properties.
 *
 * @example
 * ```typescript
 * writeToFile('/path/to/log.txt', 'This is a log message');
 *
 * writeToFile('/path/to/log.txt', { message: 'Error occurred', stack: 'Error stack trace' });
 * ```
 */
function writeToFile(filepath: string, args: any): void {
  const size: number = getFilesizeInBytes(filepath);
  let flag: 'a+' | 'w' = 'a+';
  if (size > (25 * 1024 * 1024)) { // 25MB
    flag = 'w'; // rewrite file
  }
  let text: string;
  if (typeof args === 'string') text = args;
  else if (args?.isAxiosError) text = describeAxiosError(args);
  else if (typeof args === 'object' && args?.message) text = ensureString(args.message);
  else text = safeStringify(args);
  const stream = fs.createWriteStream(filepath, { flags: flag });
  stream.write(`${new Date().toISOString()}          ${text}\n`);
  if (typeof args === 'object' && args.stack && typeof args.stack === 'string') {
    stream.write(`${args.stack}\n`);
  }
  stream.end();
}

/**
 * Console-safe form of a log argument: an Axios error becomes its one-line
 * description, and a plain object or array is printed with SENSITIVE_KEYS
 * stripped (so an Axios error nested inside one can't leak either). Strings
 * and other Errors pass through unchanged.
 */
function redactForConsole(args: any): any {
  if (!args || typeof args !== 'object') return args;
  if (args.isAxiosError) return describeAxiosError(args);
  if (args instanceof Error) return args;
  return safeStringify(args);
}

/**
 * Logs a debug message to the console and writes it to the 'debug.log' file.
 *
 * @param args - The message or object to log.
 *
 * @example
 * ```typescript
 * debug('This is a debug message');
 *
 * debug({ message: 'Debugging', details: { key: 'value' } });
 * ```
 */
function debug(args: any): void {
  try {
    console.log(redactForConsole(args));
    const filepath = `${logDir()}debug.log`;
    writeToFile(filepath, args);
  } catch (err) {
    console.error('This shall not have happened');
    console.error(err);
  }
}

/**
 * Logs an error message to the 'error.log' file and also outputs it via the debug logger.
 *
 * @param args - The error message or object to log.
 *
 * @example
 * ```typescript
 * error('An error occurred');
 *
 * error(new Error('Something went wrong'));
 * ```
 */
function error(args: any): void {
  try {
    const filepath = `${logDir()}error.log`;
    writeToFile(filepath, args);
    debug(args);
  } catch (err) {
    console.error('This shall not have happened');
    console.error(err);
  }
}

/**
 * Logs a warning message to the 'warn.log' file and also outputs it via the debug logger.
 *
 * @param args - The warning message or object to log.
 *
 * @example
 * ```typescript
 * warn('This is a warning');
 *
 * warn({ message: 'Warning occurred', code: 123 });
 * ```
 */
function warn(args: any): void {
  try {
    const filepath = `${logDir()}warn.log`;
    writeToFile(filepath, args);
    debug(args);
  } catch (err) {
    console.error('This shall not have happened');
    console.error(err);
  }
}

/**
 * Logs an informational message to the 'info.log' file and also outputs it via the debug logger.
 *
 * @param args - The informational message or object to log.
 *
 * @example
 * ```typescript
 * info('Server started successfully');
 *
 * info({ status: 'OK', uptime: '24h' });
 * ```
 */
function info(args: any): void {
  try {
    const filepath = `${logDir()}info.log`;
    writeToFile(filepath, args);
    debug(args);
  } catch (err) {
    console.error('This shall not have happened');
    console.error(err);
  }
}

export {
  error,
  warn,
  info,
  debug,
};
