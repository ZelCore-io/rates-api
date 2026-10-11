import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as util from 'util';
import type { AxiosAdapter } from 'axios';
import { AxiosError } from 'axios';
import { AxiosWrapper } from '../src/lib/axios';
import * as log from '../src/lib/log';

const K = 'FAKEKEY-0123456789abcdef';
const flush = () => new Promise((resolve) => { setTimeout(resolve, 100); });
const hits = (text: string, needle = K): number => text.split(needle).length - 1;

/** A real AxiosWrapper failure carrying the fake key in headers, raw request, URL query and params. */
async function axiosErr(): Promise<AxiosError> {
  const adapter: AxiosAdapter = async (cfg) => {
    throw new AxiosError('Request failed with status code 429', 'ERR_BAD_REQUEST', cfg, { _header: `x-cg-pro-api-key: ${K}\r\n` }, {
      status: 429, statusText: 'Too Many Requests', headers: {}, data: {}, config: cfg,
    });
  };
  const client = new AxiosWrapper('https://pro-api.example.invalid/api/v3/', 0);
  return client.get(`coins/markets?x_cg_pro_api_key=${K}`, { adapter, headers: { 'x-cg-pro-api-key': K }, params: { x_cg_pro_api_key: K } })
    .catch((e) => e);
}

// Native `cause` (non-enumerable, ES2022); the project's lib target predates the typing.
const ErrorWithCause = Error as unknown as new (message: string, options: { cause: unknown }) => Error;
const { AggregateError: Aggregate } = globalThis as unknown as { AggregateError: new (errors: unknown[], message: string) => Error };
const { Headers: WhatwgHeaders } = globalThis as unknown as { Headers: new (init: Record<string, string>) => object };

let logDir: string;
let consoleOut: string[];
const previousLogDir = process.env.LOG_DIR;

function captureConsole() {
  consoleOut = [];
  // Exactly what console.log would put on stdout (util.inspect for objects).
  const push = (...args: unknown[]) => { consoleOut.push(util.format(...args)); };
  jest.spyOn(console, 'log').mockImplementation(push);
  jest.spyOn(console, 'error').mockImplementation(push);
  jest.spyOn(console, 'warn').mockImplementation(push);
}

function readLog(name: string): string {
  const p = path.join(logDir, name);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

beforeEach(() => {
  logDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rates-api-log-'));
  process.env.LOG_DIR = logDir;
  captureConsole();
});

afterEach(() => {
  jest.restoreAllMocks();
  if (previousLogDir === undefined) delete process.env.LOG_DIR;
  else process.env.LOG_DIR = previousLogDir;
  fs.chmodSync(logDir, 0o700);
  fs.rmSync(logDir, { recursive: true, force: true });
});

describe('log redaction never leaks credentials', () => {
  const cases: [string, (err: AxiosError) => unknown][] = [
    ['a bare Axios error', (err) => err],
    ['an object holding one', (err) => ({ ctx: 'x', err })],
    ['an array of them', (err) => [err, err]],
    ['an Error whose cause is one', (err) => new ErrorWithCause('wrap', { cause: err })],
    ['a cause chain two deep', (err) => new ErrorWithCause('outer', { cause: new ErrorWithCause('middle', { cause: err }) })],
    ['an AggregateError of them', (err) => new Aggregate([err], 'agg')],
    ['an empty-message AggregateError', (err) => new Aggregate([err], '')],
    ['an Error carrying one as a property', (err) => Object.assign(new Error('x'), { inner: err })],
    ['a circular object holding one', (err) => { const o: Record<string, unknown> = { err }; o.self = o; return o; }],
    ['differently cased header keys', () => ({ Headers: { 'x-cg-pro-api-key': K }, HEADERS: { a: K }, Config: { a: K } })],
    ['WHATWG Headers', () => new WhatwgHeaders({ 'x-cg-pro-api-key': K })],
    ['WHATWG Headers nested', () => ({ hdrs: new WhatwgHeaders({ 'x-cg-pro-api-key': K }) })],
    ['the raw request config', (err) => err.config],
    ['the raw response', (err) => err.response],
  ];

  it.each(cases)('%s: 0 hits on the console, in error.log and in debug.log', async (_label, build) => {
    const value = build(await axiosErr());
    log.error(value);
    await flush();
    const printed = consoleOut.join('\n');
    expect(hits(printed)).toBe(0);
    expect(hits(readLog('error.log'))).toBe(0);
    expect(hits(readLog('debug.log'))).toBe(0);
    expect(printed).not.toContain('This shall not have happened');
    expect(readLog('error.log').length).toBeGreaterThan(0);
  });

  it('prints an Error on the console as name: message, stack and redacted cause', async () => {
    log.error(new ErrorWithCause('wrap', { cause: await axiosErr() }));
    await flush();
    const printed = consoleOut.join('\n');
    expect(printed).toContain('Error: wrap');
    expect(printed).toMatch(/\n\s+at /);
    expect(printed).toContain('Caused by: AxiosError: Request failed with status code 429');
    expect(printed).toContain('status=429');
    expect(readLog('error.log')).toContain('Caused by: AxiosError');
  });

  it('redacts credential-like query params in URLs and params objects, any case', async () => {
    log.error({
      url: 'https://x.invalid/a?ApiKey=S1&TOKEN=S2&ok=1&api_key=S3#frag',
      other: 'https://x.invalid/b?key=S4',
      params: {
        API_KEY: 'S5', Key: 'S6', apikey: 'S7', X_CG_PRO_API_KEY: 'S8', token: 'S9', page: 2,
      },
    });
    await flush();
    const all = [consoleOut.join('\n'), readLog('error.log'), readLog('debug.log')].join('\n');
    ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9'].forEach((secret) => expect(all).not.toMatch(new RegExp(`\\b${secret}\\b`)));
    expect(all).toContain('ok=1');
    expect(all).toContain('"page":2');
    expect(all).toContain('[REDACTED]');
  });

  it('logs circular objects as [Circular] instead of throwing', async () => {
    const circ: Record<string, unknown> = { a: 1 };
    circ.self = circ;
    log.error(circ);
    await flush();
    const printed = consoleOut.join('\n');
    expect(printed).toContain('[Circular]');
    expect(printed).not.toContain('This shall not have happened');
    expect(readLog('error.log')).toContain('[Circular]');
  });

  it('survives throwing getters', async () => {
    log.error({ get message() { throw new Error('getter boom'); } });
    log.error({ get isAxiosError() { throw new Error('getter boom'); } });
    await flush();
    expect(consoleOut.join('\n')).not.toContain('This shall not have happened');
  });
});

describe('LOG_DIR hardening', () => {
  it('creates a missing LOG_DIR and writes there', async () => {
    const nested = path.join(logDir, 'a', 'b');
    process.env.LOG_DIR = nested;
    log.error('hello');
    await flush();
    expect(fs.readFileSync(path.join(nested, 'error.log'), 'utf8')).toContain('hello');
  });

  it('treats a not-yet-created log file as normal: nothing but the message reaches the console', async () => {
    log.error('first line');
    await flush();
    expect(consoleOut).toEqual(['first line']);
  });

  it('falls back to console-only with one warning when LOG_DIR cannot be created', async () => {
    const blocker = path.join(logDir, 'a-file');
    fs.writeFileSync(blocker, '');
    process.env.LOG_DIR = path.join(blocker, 'sub');
    expect(() => { log.error('one'); log.warn('two'); log.info('three'); }).not.toThrow();
    await flush();
    const printed = consoleOut.join('\n');
    expect(printed).toContain('one');
    expect(printed).toContain('three');
    expect(consoleOut.filter((line) => line.includes('logging to console only'))).toHaveLength(1);
  });

  const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;
  (isRoot ? it.skip : it)('falls back to console-only with one warning when LOG_DIR is not writable', async () => {
    const locked = path.join(logDir, 'locked');
    fs.mkdirSync(locked);
    fs.chmodSync(locked, 0o500);
    process.env.LOG_DIR = locked;
    expect(() => { log.error('one'); log.error('two'); }).not.toThrow();
    await flush();
    log.error('three');
    await flush();
    expect(consoleOut.join('\n')).toContain('three');
    expect(consoleOut.filter((line) => line.includes('logging to console only'))).toHaveLength(1);
    fs.chmodSync(locked, 0o700);
    expect(fs.readdirSync(locked)).toEqual([]);
  });
});
