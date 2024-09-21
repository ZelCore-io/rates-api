import * as fs from 'fs';
import * as path from 'path';

/**
 * The base directory path where log files will be stored.
 * It is set to two levels up from the current directory.
 */
const homeDirPath: string = path.join(__dirname, '../../');

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
function writeToFile(filepath: string, args: { message?: string; stack?: string } | string): void {
  const size: number = getFilesizeInBytes(filepath);
  let flag: 'a+' | 'w' = 'a+';
  if (size > (25 * 1024 * 1024)) { // 25MB
    flag = 'w'; // rewrite file
  }
  const stream = fs.createWriteStream(filepath, { flags: flag });
  stream.write(
    `${new Date().toISOString()}          ${ensureString(
      typeof args === 'object' && args.message ? args.message : args
    )}\n`
  );
  if (typeof args === 'object' && args.stack && typeof args.stack === 'string') {
    stream.write(`${args.stack}\n`);
  }
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
    console.log(args);
    const filepath = `${homeDirPath}debug.log`;
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
    const filepath = `${homeDirPath}error.log`;
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
    const filepath = `${homeDirPath}warn.log`;
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
    const filepath = `${homeDirPath}info.log`;
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
