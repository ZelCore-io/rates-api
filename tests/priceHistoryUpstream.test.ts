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
