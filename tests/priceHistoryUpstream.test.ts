import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import { AxiosError } from 'axios';
import { AxiosWrapper } from '../src/lib/axios';
import * as log from '../src/lib/log';

const FAKE_KEY = 'fake-pro-key-for-tests-only';

/** An axios adapter that always answers with the given status and counts attempts. */
function failingAdapter(status: number) {
  const calls: InternalAxiosRequestConfig[] = [];
  const adapter: AxiosAdapter = async (cfg) => {
    calls.push(cfg);
    const response = {
      data: {}, status, statusText: String(status), headers: {}, config: cfg,
    };
    throw new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST', cfg, {}, response);
  };
  return { adapter, calls };
}

describe('shared AxiosWrapper retry behaviour (other providers)', () => {
  it('still retries a failed request three times by default', async () => {
    const { adapter, calls } = failingAdapter(429);
    const client = new AxiosWrapper('http://upstream.invalid/');
    await expect(client.get('x', { adapter })).rejects.toBeInstanceOf(AxiosError);
    expect(calls).toHaveLength(4);
  }, 10000);

  it('makes exactly one attempt when constructed with zero retries', async () => {
    const { adapter, calls } = failingAdapter(404);
    const client = new AxiosWrapper('http://upstream.invalid/', 0);
    await expect(client.get('x', { adapter })).rejects.toBeInstanceOf(AxiosError);
    expect(calls).toHaveLength(1);
  });
});

describe('CoinGecko price-history client', () => {
  it('is a separate no-retry client; the shared CoinGecko client keeps its retries', () => {
    jest.isolateModules(() => {
      jest.doMock('../src/lib/axios');
      // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
      const { default: MockedWrapper } = require('../src/lib/axios');
      // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
      const { CoinGecko } = require('../src/services/providers/coinGecko');
      CoinGecko.getInstance();
      const ctorArgs = (MockedWrapper as jest.Mock).mock.calls;
      expect(ctorArgs).toHaveLength(2);
      expect(ctorArgs[0]).toEqual([expect.stringContaining('coingecko')]); // shared: default retries
      expect(ctorArgs[1][1]).toBe(0); // price history: no retries
    });
  });
});

describe('log redaction of HTTP errors', () => {
  it('never writes request headers (API keys) of an Axios error to the console', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const err = new AxiosError('Request failed with status code 429', 'ERR_BAD_REQUEST', {
      url: 'coins/markets?ids=bitcoin',
      method: 'get',
      baseURL: 'https://pro-api.coingecko.com/api/v3/',
      headers: { 'x-cg-pro-api-key': FAKE_KEY },
    } as unknown as InternalAxiosRequestConfig, { _header: `x-cg-pro-api-key: ${FAKE_KEY}` }, {
      status: 429, statusText: 'Too Many Requests', headers: {}, data: {}, config: {} as InternalAxiosRequestConfig,
    });
    log.error(err);
    const printed = consoleSpy.mock.calls.map((args) => args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')).join('\n');
    consoleSpy.mockRestore();
    expect(printed).not.toContain(FAKE_KEY);
    expect(printed).toContain('429');
    expect(printed).toContain('coins/markets');
  });
});

describe('log redaction of an empty-message connect failure', () => {
  let logDir: string;
  const previousLogDir = process.env.LOG_DIR;

  beforeEach(() => {
    logDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rates-api-log-'));
    process.env.LOG_DIR = logDir;
  });

  afterEach(() => {
    if (previousLogDir === undefined) delete process.env.LOG_DIR;
    else process.env.LOG_DIR = previousLogDir;
    fs.rmSync(logDir, { recursive: true, force: true });
  });

  it('never writes the request headers to error.log, debug.log or the console', async () => {
    // Node's dual-stack connect failure: an AggregateError with an empty
    // message, which axios copies, so the old file path fell through to
    // JSON.stringify(error) and AxiosError.toJSON() includes config.headers.
    const adapter: AxiosAdapter = async (cfg) => {
      const refused = Object.assign(new Error('connect ECONNREFUSED ::1:1'), { code: 'ECONNREFUSED' });
      // AggregateError is ES2021; the project's lib target predates it.
      const { AggregateError: Aggregate } = globalThis as unknown as { AggregateError: new (errors: Error[], message: string) => Error };
      const aggregate = Object.assign(new Aggregate([refused], ''), { code: 'ECONNREFUSED' });
      throw AxiosError.from(aggregate, 'ECONNREFUSED', cfg, { _header: `GET / HTTP/1.1\r\nx-cg-pro-api-key: ${FAKE_KEY}\r\n` });
    };
    const client = new AxiosWrapper('http://upstream.invalid/', 0);
    const err = await client.get('coins/markets', { adapter, headers: { 'x-cg-pro-api-key': FAKE_KEY }, params: { ids: 'bitcoin' } })
      .catch((e) => e);
    expect(err.message).toBe('');
    expect(JSON.stringify(err)).toContain(FAKE_KEY); // the hazard is real

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    log.error(err);
    log.error({ context: 'nested', err });
    const printed = consoleSpy.mock.calls.map((args) => args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')).join('\n');
    consoleSpy.mockRestore();
    await new Promise((resolve) => { setTimeout(resolve, 200); });

    const errorLog = fs.readFileSync(path.join(logDir, 'error.log'), 'utf8');
    const debugLog = fs.readFileSync(path.join(logDir, 'debug.log'), 'utf8');
    expect(errorLog.split(FAKE_KEY)).toHaveLength(1);
    expect(debugLog.split(FAKE_KEY)).toHaveLength(1);
    expect(printed.split(FAKE_KEY)).toHaveLength(1);
    expect(errorLog).toContain('ECONNREFUSED');
    expect(errorLog).toContain('coins/markets');
  });
});
