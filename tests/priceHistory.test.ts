import type { Request, Response } from 'express';
import { CoinGecko } from '../src/services/providers/coinGecko';
import { getPriceHistory, clearPriceHistoryCache } from '../src/services/priceHistory';
import { getPriceHistory as getPriceHistoryHandler } from '../src/services/apiServices';

jest.mock('../src/services/providers/coinGecko');

const MockedCoinGecko = CoinGecko as jest.Mocked<typeof CoinGecko>;

const DAY_S = 86400;
const HOUR_S = 3600;

/**
 * Fake CoinGecko `market_chart/range`: daily points at 00:00 UTC for spans
 * over 90 days, hourly otherwise, mirroring the upstream auto-granularity.
 */
function fakeRange(id: string, vs: string, from: number, to: number): { prices: [number, number][] } {
  const step = to - from > 90 * DAY_S ? DAY_S : HOUR_S;
  const prices: [number, number][] = [];
  for (let t = Math.ceil(from / step) * step; t <= to; t += step) {
    prices.push([t * 1000, t / 1e6]);
  }
  return { prices };
}

function mockUpstream(impl: (id: string, vs: string, from: number, to: number) => Promise<unknown> = async (...args) => fakeRange(...args)) {
  const getMarketChartRange = jest.fn(impl);
  MockedCoinGecko.getInstance.mockReturnValue({ getMarketChartRange } as never);
  return getMarketChartRange;
}

function upstreamError(status: number): Error {
  return Object.assign(new Error(`Request failed with status code ${status}`), { isAxiosError: true, response: { status } });
}

function mockRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json.mockImplementation((body: unknown) => {
    res.body = body;
    return res;
  });
  return res;
}

async function callHandler(geckoId: string, query: Record<string, string | undefined>) {
  const req = { params: { geckoId }, query } as unknown as Request;
  const res = mockRes();
  await getPriceHistoryHandler(req, res as unknown as Response);
  return res;
}

const utc = (iso: string): number => Math.floor(Date.parse(iso) / 1000);

beforeEach(() => {
  clearPriceHistoryCache();
  jest.clearAllMocks();
});

describe('price history parameter validation', () => {
  const valid = { vs: 'eur', from: String(utc('2018-01-01T00:00:00Z')), to: String(utc('2018-12-31T23:59:59Z')) };

  it.each([
    ['an uppercase / punctuated geckoId', 'Bitcoin!', valid],
    ['an over-long geckoId', 'a'.repeat(101), valid],
    ['an unsupported vs currency', 'bitcoin', { ...valid, vs: 'xyz' }],
    ['a crypto vs currency', 'bitcoin', { ...valid, vs: 'btc' }],
    ['a missing vs currency', 'bitcoin', { ...valid, vs: undefined }],
    ['a missing from', 'bitcoin', { ...valid, from: undefined }],
    ['a non-numeric to', 'bitcoin', { ...valid, to: 'yesterday' }],
    ['from equal to to', 'bitcoin', { ...valid, to: valid.from }],
    ['from after to', 'bitcoin', { ...valid, from: valid.to, to: valid.from }],
    ['a span over 10 years', 'bitcoin', { ...valid, from: String(utc('2010-01-01T00:00:00Z')), to: String(utc('2020-01-03T00:00:00Z')) }],
  ])('rejects %s with 400 and no upstream call', async (_label, geckoId, query) => {
    const upstream = mockUpstream();
    const res = await callHandler(geckoId as string, query as Record<string, string | undefined>);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: expect.any(String) });
    expect(upstream).not.toHaveBeenCalled();
  });

  it('accepts a valid request, case-insensitive vs, and answers 200', async () => {
    const upstream = mockUpstream();
    const res = await callHandler('bitcoin', { ...valid, vs: 'EUR' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ prices: expect.any(Array), granularity: 'daily' });
    expect(upstream).toHaveBeenCalledTimes(1);
    expect(upstream.mock.calls[0][1]).toBe('eur');
  });

  it('maps an unknown CoinGecko id (upstream 404) to 404', async () => {
    mockUpstream(async () => { throw upstreamError(404); });
    const res = await callHandler('not-a-coin', valid);
    expect(res.statusCode).toBe(404);
  });
});

describe('price history caching (old spans, daily)', () => {
  const from = utc('2018-01-01T00:00:00Z');
  const to = utc('2019-12-31T23:59:59Z');

  it('serves a 2-year span with one upstream call, then from cache with zero calls', async () => {
    const upstream = mockUpstream();
    const first = await getPriceHistory('bitcoin', 'eur', from, to);
    expect(upstream).toHaveBeenCalledTimes(1);
    expect(first.granularity).toBe('daily');
    expect(first.prices).toHaveLength(730);
    expect(first.prices[0][0]).toBe(from * 1000);
    expect(first.prices[first.prices.length - 1][0]).toBe(utc('2019-12-31T00:00:00Z') * 1000);

    upstream.mockClear();
    const second = await getPriceHistory('bitcoin', 'eur', from, to);
    expect(upstream).not.toHaveBeenCalled();
    expect(second).toEqual(first);
  });

  it('serves a cached sub-range without an upstream call and trims to the requested window', async () => {
    const upstream = mockUpstream();
    await getPriceHistory('bitcoin', 'eur', from, to);
    upstream.mockClear();
    const sub = await getPriceHistory('bitcoin', 'eur', utc('2018-06-01T12:00:00Z'), utc('2018-06-10T12:00:00Z'));
    expect(upstream).not.toHaveBeenCalled();
    expect(sub.prices.map(([ms]) => ms)).toEqual(
      Array.from({ length: 9 }, (_, i) => (utc('2018-06-02T00:00:00Z') + i * DAY_S) * 1000),
    );
  });

  it('keeps cache entries separate per vs currency', async () => {
    const upstream = mockUpstream();
    await getPriceHistory('bitcoin', 'eur', from, to);
    await getPriceHistory('bitcoin', 'usd', from, to);
    expect(upstream).toHaveBeenCalledTimes(2);
  });
});

describe('price history hourly split (recent spans)', () => {
  it('splits a range ending within the last 90 days into upstream calls of at most 90 days', async () => {
    const upstream = mockUpstream();
    const now = Math.floor(Date.now() / 1000);
    const from = now - 200 * DAY_S;
    const result = await getPriceHistory('bitcoin', 'usd', from, now);

    expect(result.granularity).toBe('hourly');
    expect(upstream.mock.calls.length).toBe(3);
    const calls = upstream.mock.calls.map(([, , f, t]) => [f, t] as [number, number]);
    calls.forEach(([f, t]) => expect(t - f).toBeLessThanOrEqual(90 * DAY_S));
    // Contiguous, covering whole UTC days from the first requested day to now.
    expect(calls[0][0]).toBe(Math.floor(from / DAY_S) * DAY_S);
    for (let i = 1; i < calls.length; i += 1) expect(calls[i][0]).toBe(calls[i - 1][1] + 1);
    expect(calls[calls.length - 1][1]).toBeGreaterThanOrEqual(now);

    // Hourly points inside the requested window only.
    expect(result.prices[0][0]).toBeGreaterThanOrEqual(from * 1000);
    expect(result.prices[result.prices.length - 1][0]).toBeLessThanOrEqual(now * 1000);
    expect(result.prices[1][0] - result.prices[0][0]).toBe(HOUR_S * 1000);

    upstream.mockClear();
    await getPriceHistory('bitcoin', 'usd', from, now);
    expect(upstream).not.toHaveBeenCalled();
  });
});

describe('price history upstream failures', () => {
  const query = { vs: 'eur', from: String(utc('2018-01-01T00:00:00Z')), to: String(utc('2018-12-31T23:59:59Z')) };

  it('maps an upstream 429 to 502 and does not cache the failure', async () => {
    const upstream = mockUpstream(async () => { throw upstreamError(429); });
    const failed = await callHandler('bitcoin', query);
    expect(failed.statusCode).toBe(502);
    expect(failed.body).toEqual({ error: expect.any(String) });

    upstream.mockImplementation(async (...args) => fakeRange(...args));
    const retried = await callHandler('bitcoin', query);
    expect(upstream).toHaveBeenCalledTimes(2);
    expect(retried.statusCode).toBe(200);
    expect((retried.body as { prices: unknown[] }).prices).toHaveLength(365);
  });

  it('maps a network failure (no response) to 502', async () => {
    mockUpstream(async () => { throw new Error('socket hang up'); });
    const res = await callHandler('bitcoin', query);
    expect(res.statusCode).toBe(502);
  });
});
