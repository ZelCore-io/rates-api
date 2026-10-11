import * as fs from 'fs';
import * as path from 'path';

/**
 * The base directory path where log files will be stored.
 * It is set to two levels up from the current directory.
 */
const homeDirPath: string = path.join(__dirname, '../../');

/** Log directory: `LOG_DIR` when set (read per write), else the app root as before. */
function logDir(): string {
  return process.env.LOG_DIR ? `${path.resolve(process.env.LOG_DIR)}${path.sep}` : homeDirPath;
}

/** Directories already created/checked, and ones that failed (console-only from then on). */
const preparedDirs = new Set<string>();
const failedDirs = new Set<string>();

/** Marks a log directory unusable and warns once; logging continues on the console. */
function disableDir(dir: string, err: unknown): void {
  if (failedDirs.has(dir)) return;
  failedDirs.add(dir);
  const code = (err as { code?: string })?.code ?? String(err);
  console.error(`log: cannot write log files to ${dir} (${code}); logging to console only`);
}

/** Creates the log directory once (recursive, inside a try); false when files can't be written there. */
function prepareDir(dir: string): boolean {
  if (failedDirs.has(dir)) return false;
  if (!preparedDirs.has(dir)) {
    preparedDirs.add(dir);
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (err) {
      disableDir(dir, err);
      return false;
    }
  }
  return true;
}

/**
 * Object keys never written to any log, compared case-insensitively. An
 * Axios error carries the request config and the raw request
 * (`config.headers`, `request._header`), which hold provider API keys.
 */
const SENSITIVE_KEYS = new Set(['config', 'request', 'headers', '_header']);

/**
 * Credential-like names whose values are replaced with `[REDACTED]`, as
 * object keys or URL query params; compared lowercased with `-` read as `_`.
 */
const CREDENTIAL_KEYS = new Set([
  'x_cg_pro_api_key', 'api_key', 'apikey', 'key', 'token', 'access_token', 'x_api_key', 'authorization',
]);

const CREDENTIAL_QUERY_RE = /([?&;](?:x[-_]cg[-_]pro[-_]api[-_]key|api[-_]?key|key|token|access[-_]token|x[-_]api[-_]key)=)[^&#\s"'<>]*/gi;
const CREDENTIAL_HEADER_RE = /((?:x-cg-pro-api-key|x-api-key|authorization)\s*:\s*)[^\r\n"]*/gi;

const MAX_DEPTH = 8;

const isCredentialKey = (key: string): boolean => CREDENTIAL_KEYS.has(key.toLowerCase().replace(/-/g, '_'));

/** Redacts credential query params and header lines inside a string. */
function redactString(text: string): string {
  return text.replace(CREDENTIAL_QUERY_RE, '$1[REDACTED]').replace(CREDENTIAL_HEADER_RE, '$1[REDACTED]');
}

/** Property read that never throws (getters can). */
function safeGet(obj: any, key: string): any {
  try {
    return obj?.[key];
  } catch {
    return '[Unreadable]';
  }
}

function isAxiosError(value: any): boolean {
  return safeGet(value, 'isAxiosError') === true;
}

function isError(value: any): boolean {
  try {
    return value instanceof Error;
  } catch {
    return false;
  }
}

/**
 * Log-safe one-liner for an Axios error: message (or code, when Node raised
 * an empty-message AggregateError), method, URL path without query, status.
 */
function describeAxiosError(err: any): string {
  const config = safeGet(err, 'config');
  const method = String(safeGet(config, 'method') ?? '').toUpperCase();
  const url = `${safeGet(config, 'baseURL') ?? ''}${String(safeGet(config, 'url') ?? '').split('?')[0]}`;
  const status = safeGet(safeGet(err, 'response'), 'status') ?? safeGet(err, 'code') ?? 'no response';
  return `AxiosError: ${safeGet(err, 'message') || safeGet(err, 'code') || 'request failed'} [${method} ${url}] status=${status}`;
}

/** Objects on the current render path, for cycle detection. */
type Ancestors = Set<unknown>;

/**
 * Turns any value into JSON-safe data with credentials removed: sensitive
 * keys dropped, credential keys and URL params redacted, Errors rendered as
 * text, WHATWG Headers withheld, cycles replaced with `[Circular]`.
 */
function sanitize(value: any, ancestors: Ancestors, depth: number): any {
  if (typeof value === 'string') return redactString(value);
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value !== 'object') return undefined; // functions, symbols, undefined
  if (ancestors.has(value)) return '[Circular]';
  if (depth > MAX_DEPTH) return '[Depth limit]';
  // eslint-disable-next-line @typescript-eslint/no-use-before-define -- sanitize and renderError recurse into each other.
  if (isError(value) || isAxiosError(value)) return renderError(value, ancestors, depth + 1);
  if (typeof Headers !== 'undefined' && value instanceof Headers) return '[Headers withheld]';

  ancestors.add(value);
  try {
    if (Array.isArray(value)) return value.map((item) => sanitize(item, ancestors, depth + 1) ?? null);
    const toJSON = safeGet(value, 'toJSON');
    if (typeof toJSON === 'function') {
      let json: any;
      try {
        json = toJSON.call(value);
      } catch {
        return '[Unserialisable]';
      }
      if (json !== value) return sanitize(json, ancestors, depth + 1);
    }
    const out: Record<string, unknown> = {};
    let keys: string[] = [];
    try {
      keys = Object.keys(value);
    } catch {
      return '[Unreadable]';
    }
    keys.forEach((key) => {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) return;
      if (isCredentialKey(key)) {
        out[key] = '[REDACTED]';
        return;
      }
      const clean = sanitize(safeGet(value, key), ancestors, depth + 1);
      if (clean !== undefined) out[key] = clean;
    });
    return out;
  } finally {
    ancestors.delete(value);
  }
}

/**
 * Renders an Error as `name: message`, its stack frames, its own extra
 * properties (sanitised), AggregateError members and its `cause` chain, all
 * through the same redaction. An Axios error's header line is
 * describeAxiosError; its config, request and response are never rendered.
 */
function renderError(err: any, ancestors: Ancestors, depth: number): string {
  if (ancestors.has(err)) return '[Circular]';
  if (depth > MAX_DEPTH) return '[Depth limit]';
  ancestors.add(err);
  try {
    const axios = isAxiosError(err);
    const name = String(safeGet(err, 'name') || 'Error');
    const message = safeGet(err, 'message');
    const lines = [axios ? describeAxiosError(err) : `${name}: ${message ?? ''}`];

    const stack = safeGet(err, 'stack');
    if (typeof stack === 'string') {
      const frames = stack.indexOf('\n    at ');
      if (frames >= 0) lines.push(stack.slice(frames + 1));
    }

    const skip = new Set(['stack', 'message', 'name', 'cause', 'errors', ...(axios ? ['response', 'status', 'code', 'isAxiosError'] : [])]);
    const extras: Record<string, unknown> = {};
    let ownKeys: string[] = [];
    try {
      ownKeys = Object.keys(err);
    } catch {
      ownKeys = [];
    }
    ownKeys.filter((key) => !skip.has(key)).forEach((key) => { extras[key] = safeGet(err, key); });
    const props = sanitize(extras, ancestors, depth + 1);
    if (props && typeof props === 'object' && Object.keys(props).length) lines.push(`  props: ${JSON.stringify(props)}`);

    const members = safeGet(err, 'errors');
    if (Array.isArray(members)) {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define -- renderError and toText recurse into each other.
      members.forEach((member, i) => lines.push(`  [${i}] ${toText(member, ancestors, depth + 1)}`));
    }

    const cause = safeGet(err, 'cause');
    // eslint-disable-next-line @typescript-eslint/no-use-before-define -- renderError and toText recurse into each other.
    if (cause !== undefined) lines.push(`Caused by: ${toText(cause, ancestors, depth + 1)}`);
    return redactString(lines.join('\n'));
  } finally {
    ancestors.delete(err);
  }
}

/** The one log-safe text form used for both the console and the files. */
function toText(value: any, ancestors: Ancestors = new Set(), depth = 0): string {
  try {
    if (typeof value === 'string') return redactString(value);
    if (isError(value) || isAxiosError(value)) return renderError(value, ancestors, depth);
    const clean = sanitize(value, ancestors, depth);
    return typeof clean === 'string' ? clean : String(JSON.stringify(clean));
  } catch {
    return '[Unloggable value]';
  }
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
    // A log file that doesn't exist yet is the normal first-write case.
    if ((e as { code?: string })?.code !== 'ENOENT') console.log(toText(e));
    return 0;
  }
}

/**
 * Appends one already-redacted line to a log file, rewriting it past 25MB.
 * Skips silently (console-only) once the directory has proved unusable.
 *
 * @param filepath - The path to the log file.
 * @param text - Log-safe text from toText().
 */
function writeToFile(filepath: string, text: string): void {
  const dir = path.dirname(filepath);
  if (!prepareDir(dir)) return;
  const size: number = getFilesizeInBytes(filepath);
  let flag: 'a+' | 'w' = 'a+';
  if (size > (25 * 1024 * 1024)) { // 25MB
    flag = 'w'; // rewrite file
  }
  const stream = fs.createWriteStream(filepath, { flags: flag });
  // An unwritable directory surfaces here, asynchronously; without a
  // listener the 'error' event would crash the process.
  stream.on('error', (err) => disableDir(dir, err));
  stream.write(`${new Date().toISOString()}          ${text}\n`);
  stream.end();
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
    const text = toText(args);
    console.log(text);
    writeToFile(`${logDir()}debug.log`, text);
  } catch (err) {
    console.error('This shall not have happened');
    console.error(toText(err));
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
    writeToFile(`${logDir()}error.log`, toText(args));
    debug(args);
  } catch (err) {
    console.error('This shall not have happened');
    console.error(toText(err));
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
    writeToFile(`${logDir()}warn.log`, toText(args));
    debug(args);
  } catch (err) {
    console.error('This shall not have happened');
    console.error(toText(err));
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
    writeToFile(`${logDir()}info.log`, toText(args));
    debug(args);
  } catch (err) {
    console.error('This shall not have happened');
    console.error(toText(err));
  }
}

// Startup: create LOG_DIR (or confirm the default) once, inside a try.
prepareDir(path.dirname(`${logDir()}x`));

export {
  error,
  warn,
  info,
  debug,
};
