import * as fs from 'fs';
import * as path from 'path';

const homeDirPath: string = path.join(__dirname, '../../');

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

function ensureString(parameter: any): string {
  return typeof parameter === 'string' ? parameter : JSON.stringify(parameter);
}


function writeToFile(filepath: string, args: { message?: string; stack?: string }| string): void {
  const size: number = getFilesizeInBytes(filepath);
  let flag: 'a+' | 'w' = 'a+';
  if (size > (25 * 1024 * 1024)) { // 25MB
    flag = 'w'; // rewrite file
  }
  const stream = fs.createWriteStream(filepath, { flags: flag });
  stream.write(`${new Date().toISOString()}          ${ensureString(typeof args === "object" && args.message ? args.message : args)}\n`);
  if (typeof args === "object" && args.stack && typeof args.stack === 'string') {
    stream.write(`${args.stack}\n`);
  }
  stream.end();
}

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
