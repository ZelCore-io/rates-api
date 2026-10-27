import * as http from 'http';
import * as net from 'net';
import express from 'express';
import apicache from 'apicache';
import routes from '../src/routes';
import { CoinGecko } from '../src/services/providers/coinGecko';
import { CoinPaprika } from '../src/services/providers/coinPaprika';
import { resetBlockbookMirrorState } from '../src/services/blockbookMirror';
import * as log from '../src/lib/log';

jest.mock('../src/services/providers/coinGecko');
jest.mock('../src/services/providers/coinPaprika');
jest.mock('../src/lib/log');

const MockedCoinGecko = CoinGecko as jest.Mocked<typeof CoinGecko>;
const MockedCoinPaprika = CoinPaprika as jest.Mocked<typeof CoinPaprika>;
const mockedWarn = log.warn as jest.Mock;
const DAY_MS = 86_400_000;
const BASE = '/v2/blockbook/api/v3';

const app = express();
routes(app);

/** Drives the real Express app in-process: no listen(), no network. */
function get(url: string): Promise<{ status: number; body: string; retryAfter?: string }> {
  return new Promise((resolve) => {
    const req = new http.IncomingMessage(new net.Socket());
    req.method = 'GET';
    req.url = url;
    req.headers = {};
    const res = new http.ServerResponse(req);
    let body = '';
    const end = res.end.bind(res);
    res.end = ((chunk?: unknown, ...rest: unknown[]) => {
      if (chunk) body += String(chunk);
      const out = (end as (...a: unknown[]) => http.ServerResponse)(chunk, ...rest);
      setImmediate(() => resolve({ status: res.statusCode, body, retryAfter: res.getHeader('retry-after') as string | undefined }));
      return out;
    }) as typeof res.end;
    (app as unknown as { handle: (q: unknown, s: unknown, next: () => void) => void })
      .handle(req, res, () => resolve({ status: 404, body: '' }));
  });
}

function upstreamError(status: number, headers: Record<string, string> = {}): Error {
  return Object.assign(new Error(`Request failed with status code ${status}`), { isAxiosError: true, response: { status, headers } });
}

let gecko: Record<string, jest.Mock>;

beforeEach(() => {
  jest.clearAllMocks();
  resetBlockbookMirrorState();
  apicache.clear(undefined as unknown as string);
  const today = Math.floor(Date.now() / DAY_MS) * DAY_MS;
  gecko = {
    getSupportedVsCurrencies: jest.fn(async () => ['btc', 'eth', 'usd', 'eur']),
    getSimplePrice: jest.fn(async () => ({ bitcoin: { usd: 60000, eur: 50000, btc: 1 } })),
    getMarketChart: jest.fn(async () => ({
      prices: [[today - DAY_MS, 1], [today, null], [Date.now(), 2]],
      market_caps: [[today, 5]],
      total_volumes: [[today, 6]],
    })),
  };
  MockedCoinGecko.getInstance.mockReturnValue(gecko as never);
  MockedCoinPaprika.getInstance.mockReturnValue({ getTicker: jest.fn(async () => ({ quotes: { USD: { price: 0.6 } } })) } as never);
});

describe('Blockbook mirror routes', () => {
  it('serves supported_vs_currencies as a JSON string array', async () => {
    const res = await get(`${BASE}/simple/supported_vs_currencies`);
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toEqual(['btc', 'eth', 'usd', 'eur']);
  });

  it('serves simple/price as {id: {vs: number}}, including a fallback coin', async () => {
    const res = await get(`${BASE}/simple/price?ids=bitcoin,groestlcoin&vs_currencies=usd,eur`);
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.bitcoin).toEqual({ usd: 60000, eur: 50000 });
    expect(body.groestlcoin.usd).toBeCloseTo(0.6);
    expect(body.groestlcoin.eur).toBeCloseTo(0.5);
  });

  it('serves market_chart with prices only, nulls dropped', async () => {
    const res = await get(`${BASE}/coins/bitcoin/market_chart?vs_currency=usd&days=1`);
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body);
    expect(Object.keys(body)).toEqual(['prices']);
    expect(body.prices).toHaveLength(2);
  });

  it('answers 400 {error} for bad parameters', async () => {
    const res = await get(`${BASE}/coins/bitcoin/market_chart?vs_currency=usd&days=max`);
    expect(res.status).toBe(400);
    expect(JSON.parse(res.body)).toEqual({ error: expect.any(String) });
    expect((await get(`${BASE}/simple/price?ids=bitcoin&ids=litecoin&vs_currencies=usd`)).status).toBe(400);
  });

  it('answers 404 {"error":"coin not found"} for an id ZelCore does not list', async () => {
    const res = await get(`${BASE}/coins/definitely-not-listed/market_chart?vs_currency=usd&days=1&interval=daily`);
    expect(res.status).toBe(404);
    expect(res.body).toBe('{"error":"coin not found"}');
    expect(gecko.getMarketChart).not.toHaveBeenCalled();
  });

  it('answers 429 with Retry-After when CoinGecko rate-limits, and keeps refusing during the cooldown', async () => {
    gecko.getMarketChart.mockImplementation(async () => { throw upstreamError(429, { 'retry-after': '90' }); });
    const res = await get(`${BASE}/coins/bitcoin/market_chart?vs_currency=usd&days=max&interval=daily`);
    expect(res.status).toBe(429);
    expect(res.retryAfter).toBe('90');
    const again = await get(`${BASE}/coins/bitcoin/market_chart?vs_currency=eur&days=max&interval=daily`);
    expect(again.status).toBe(429);
    expect(gecko.getMarketChart).toHaveBeenCalledTimes(1);
  });

  it('answers 502 {error} on an upstream failure and never caches it', async () => {
    gecko.getMarketChart.mockImplementationOnce(async () => { throw upstreamError(500); });
    const url = `${BASE}/coins/bitcoin/market_chart?vs_currency=usd&days=90`;
    expect((await get(url)).status).toBe(502);
    expect((await get(url)).status).toBe(200);
    expect(apicache.getIndex().all).toHaveLength(0);
  });

  it('logs every 502 as one line with route, id, vs and reason', async () => {
    gecko.getMarketChart.mockImplementationOnce(async () => { throw upstreamError(500); });
    expect((await get(`${BASE}/coins/bitcoin/market_chart?vs_currency=usd&days=90`)).status).toBe(502);
    expect(mockedWarn).toHaveBeenCalledTimes(1);
    expect(mockedWarn).toHaveBeenCalledWith('Blockbook mirror 502: market_chart id=bitcoin vs=usd reason=CoinGecko chart bitcoin|usd|90 failed: 500');

    mockedWarn.mockClear();
    gecko.getSimplePrice.mockImplementationOnce(async () => ({}));
    const res = await get(`${BASE}/simple/price?ids=bitcoin&vs_currencies=usd,eur`);
    expect(res.status).toBe(502);
    expect(JSON.parse(res.body)).toEqual({ error: 'Upstream returned no price' });
    expect(mockedWarn).toHaveBeenCalledTimes(1);
    expect(mockedWarn).toHaveBeenCalledWith('Blockbook mirror 502: simple/price id=bitcoin vs=usd,eur reason=CoinGecko price bitcoin: Upstream returned no price');
  });

  it('answers and logs 502 when a fallback coin\'s pre-since CoinGecko history is gone (404)', async () => {
    gecko.getMarketChart.mockImplementation(async () => { throw upstreamError(404); });
    MockedCoinPaprika.getInstance.mockReturnValue({ getHistorical: jest.fn(async () => [{ timestamp: '2026-07-20T00:00:00Z', price: 0.6 }]) } as never);
    const res = await get(`${BASE}/coins/groestlcoin/market_chart?vs_currency=usd&days=max&interval=daily`);
    expect(res.status).toBe(502);
    expect(mockedWarn).toHaveBeenCalledTimes(1);
    expect(mockedWarn.mock.calls[0][0]).toMatch(/^Blockbook mirror 502: market_chart id=groestlcoin vs=usd reason=CoinGecko history before 2026-07-20 for groestlcoin\|usd unavailable: /);
  });
});
