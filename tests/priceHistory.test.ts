import type { Request, Response } from 'express';
import { CoinGecko } from '../src/services/providers/coinGecko';
import { getPriceHistory, resetPriceHistoryState, PriceHistoryError } from '../src/services/priceHistory';
import { getPriceHistory as getPriceHistoryHandler } from '../src/services/apiServices';
import config from '../config';

jest.mock('../src/services/providers/coinGecko');

const MockedCoinGecko = CoinGecko as jest.Mocked<typeof CoinGecko>;

const DAY_S = 86400;
const HOUR_S = 3600;
const DEFAULTS = { ...config.priceHistory };

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

type Upstream = (id: string, vs: string, from: number, to: number) => Promise<unknown>;

function mockUpstream(impl: Upstream = async (...args) => fakeRange(...args)) {
  const getMarketChartRange = jest.fn(impl);
  MockedCoinGecko.getInstance.mockReturnValue({ getMarketChartRange } as never);
  return getMarketChartRange;
}

function upstreamError(status: number, headers: Record<string, string> = {}): Error {
  return Object.assign(new Error(`Request failed with status code ${status}`), { isAxiosError: true, response: { status, headers } });
}

function mockRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status: jest.fn(),
    json: jest.fn(),
    set: jest.fn(),
  };
  res.status.mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json.mockImplementation((body: unknown) => {
    res.body = body;
    return res;
  });
  res.set.mockImplementation((name: string, value: string) => {
    res.headers[name.toLowerCase()] = String(value);
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
const Y2018 = { from: utc('2018-01-01T00:00:00Z'), to: utc('2018-12-31T23:59:59Z') };

let nowMs: number;
const realNow = Date.now.bind(Date);

beforeEach(() => {
  nowMs = realNow();
  jest.spyOn(Date, 'now').mockImplementation(() => nowMs);
  Object.assign(config.priceHistory, DEFAULTS);
  resetPriceHistoryState();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('price history parameter validation', () => {
  const valid = { vs: 'eur', from: String(Y2018.from), to: String(Y2018.to) };

  it.each([
    ['an uppercase / punctuated geckoId', 'Bitcoin!', valid],
    ['an over-long geckoId', 'a'.repeat(101), valid],
    ['an unsupported vs currency', 'bitcoin', { ...valid, vs: 'xyz' }],
    ['a crypto vs currency', 'bitcoin', { ...valid, vs: 'btc' }],
    ['a missing vs currency', 'bitcoin', { ...valid, vs: undefined }],
    ['a missing from', 'bitcoin', { ...valid, from: undefined }],
    ['a non-numeric to', 'bitcoin', { ...valid, to: 'yesterday' }],
    ['from equal to to', 'bitcoin', { ...valid, to: valid.from }],
    ['a reversed range', 'bitcoin', { ...valid, from: valid.to, to: valid.from }],
    ['a span over 10 years', 'bitcoin', { ...valid, from: String(utc('2010-01-01T00:00:00Z')), to: String(utc('2020-01-03T00:00:00Z')) }],
  ])('rejects %s with 400 and no upstream call', async (_label, geckoId, query) => {
    const upstream = mockUpstream();
    const res = await callHandler(geckoId as string, query as Record<string, string | undefined>);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: expect.any(String) });
    expect(upstream).not.toHaveBeenCalled();
  });

  it('rejects a range that starts in the future with 400 and no upstream call', async () => {
    const upstream = mockUpstream();
    const nowS = Math.floor(nowMs / 1000);
    const res = await callHandler('bitcoin', { vs: 'eur', from: String(nowS + DAY_S), to: String(nowS + 2 * DAY_S) });
    expect(res.statusCode).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('accepts a valid request, case-insensitive vs, and answers 200', async () => {
    const upstream = mockUpstream();
    const res = await callHandler('bitcoin', { ...valid, vs: 'EUR' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      prices: expect.any(Array),
      granularity: 'daily',
      segments: [{ granularity: 'daily', from: Y2018.from * 1000, to: Y2018.to * 1000 }],
    });
    expect(upstream).toHaveBeenCalledTimes(1);
    expect(upstream.mock.calls[0][1]).toBe('eur');
  });
});

describe('price history id gate and negative caching', () => {
  it('answers 404 for an id outside the supported coin list without any upstream call', async () => {
    const upstream = mockUpstream();
    const res = await callHandler('definitely-not-a-zelcore-coin', { vs: 'eur', from: String(Y2018.from), to: String(Y2018.to) });
    expect(res.statusCode).toBe(404);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('caches an upstream 404 so the next request makes no upstream call', async () => {
    const upstream = mockUpstream(async () => { throw upstreamError(404); });
    await expect(getPriceHistory('bitcoin', 'eur', Y2018.from, Y2018.to)).rejects.toMatchObject({ status: 404 });
    await expect(getPriceHistory('bitcoin', 'usd', Y2018.from, Y2018.to)).rejects.toMatchObject({ status: 404 });
    expect(upstream).toHaveBeenCalledTimes(1);

    nowMs += config.priceHistory.notFoundCacheMs + 1000;
    upstream.mockImplementation(async (...args) => fakeRange(...args));
    await expect(getPriceHistory('bitcoin', 'eur', Y2018.from, Y2018.to)).resolves.toMatchObject({ granularity: 'daily' });
    expect(upstream).toHaveBeenCalledTimes(2);
  });

  it('caches an empty upstream result briefly, then asks again', async () => {
    const upstream = mockUpstream(async () => ({ prices: [] }));
    const first = await getPriceHistory('bitcoin', 'eur', Y2018.from, Y2018.to);
    expect(first.prices).toEqual([]);
    await getPriceHistory('bitcoin', 'eur', Y2018.from, Y2018.to);
    expect(upstream).toHaveBeenCalledTimes(1);

    nowMs += config.priceHistory.emptyDayCacheMs + 1000;
    await getPriceHistory('bitcoin', 'eur', Y2018.from, Y2018.to);
    expect(upstream).toHaveBeenCalledTimes(2);
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

  it('bounds the cache by point count, evicting the oldest days', async () => {
    config.priceHistory.cacheMaxPoints = 2000; // a day costs points + 1
    resetPriceHistoryState();
    const upstream = mockUpstream();
    await getPriceHistory('bitcoin', 'eur', from, to); // 730 days, size 1460: fits
    await getPriceHistory('bitcoin', 'eur', from, to);
    expect(upstream).toHaveBeenCalledTimes(1);
    await getPriceHistory('bitcoin', 'usd', from, to); // 1460 more: evicts the oldest eur days
    upstream.mockClear();
    await getPriceHistory('bitcoin', 'eur', from, to);
    expect(upstream).toHaveBeenCalledTimes(1);
  });
});

describe('price history range shaping (recent spans)', () => {
  it('serves a range inside the last 90 days hourly from one upstream call', async () => {
    const upstream = mockUpstream();
    const now = Math.floor(nowMs / 1000);
    const result = await getPriceHistory('bitcoin', 'usd', now - 30 * DAY_S, now);
    expect(upstream).toHaveBeenCalledTimes(1);
    expect(result.granularity).toBe('hourly');
    expect(result.segments).toEqual([{ granularity: 'hourly', from: (now - 30 * DAY_S) * 1000, to: now * 1000 }]);
    expect(result.prices[1][0] - result.prices[0][0]).toBe(HOUR_S * 1000);
  });

  it('serves a 10-year span ending now with two upstream calls: daily history plus the hourly last 90 days', async () => {
    const upstream = mockUpstream();
    const now = Math.floor(nowMs / 1000);
    const from = now - 3650 * DAY_S;
    const result = await getPriceHistory('bitcoin', 'usd', from, now);

    expect(upstream).toHaveBeenCalledTimes(2);
    const calls = upstream.mock.calls.map(([, , f, t]) => [f, t] as [number, number]);
    const hourlyStartS = (Math.floor(now / DAY_S) - 89) * DAY_S;
    expect(calls[0]).toEqual([Math.floor(from / DAY_S) * DAY_S, hourlyStartS - 1]);
    expect(calls[1][0]).toBe(hourlyStartS);
    expect(calls[1][1]).toBe(now);
    expect(calls[1][1] - calls[1][0]).toBeLessThan(90 * DAY_S);

    expect(result.granularity).toBe('mixed');
    expect(result.segments).toEqual([
      { granularity: 'daily', from: from * 1000, to: hourlyStartS * 1000 - 1 },
      { granularity: 'hourly', from: hourlyStartS * 1000, to: now * 1000 },
    ]);
    const daily = result.prices.filter(([ms]) => ms < hourlyStartS * 1000);
    const hourly = result.prices.filter(([ms]) => ms >= hourlyStartS * 1000);
    expect(daily[1][0] - daily[0][0]).toBe(DAY_S * 1000);
    expect(hourly[1][0] - hourly[0][0]).toBe(HOUR_S * 1000);

    upstream.mockClear();
    await getPriceHistory('bitcoin', 'usd', from, now);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('clamps a range end in the future to now and a start before CoinGecko history to its first day', async () => {
    const upstream = mockUpstream();
    const now = Math.floor(nowMs / 1000);
    const result = await getPriceHistory('bitcoin', 'usd', now - 10 * DAY_S, now + 5 * DAY_S);
    expect(upstream.mock.calls[0][3]).toBe(now);
    expect(result.prices[result.prices.length - 1][0]).toBeLessThanOrEqual(now * 1000);

    upstream.mockClear();
    await getPriceHistory('bitcoin', 'usd', utc('2010-01-01T00:00:00Z'), utc('2014-01-01T00:00:00Z'));
    expect(upstream.mock.calls[0][2]).toBe(utc('2013-04-28T00:00:00Z'));
  });
});

describe('price history upstream protection', () => {
  it('coalesces a parallel flood of one key into a single upstream call', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const upstream = mockUpstream(async (...args) => {
      await gate;
      return fakeRange(...args);
    });
    const flood = Array.from({ length: 50 }, () => getPriceHistory('bitcoin', 'eur', Y2018.from, Y2018.to));
    release();
    const results = await Promise.all(flood);
    expect(upstream).toHaveBeenCalledTimes(1);
    results.forEach((r) => expect(r.prices).toHaveLength(365));
  });

  it('enforces the per-minute budget with 503 + Retry-After and no queued upstream call', async () => {
    config.priceHistory.upstreamBurst = 2;
    config.priceHistory.upstreamPerMinute = 60;
    resetPriceHistoryState();
    const upstream = mockUpstream();
    await getPriceHistory('bitcoin', 'eur', Y2018.from, Y2018.to);
    await getPriceHistory('bitcoin', 'usd', Y2018.from, Y2018.to);
    const err = await getPriceHistory('bitcoin', 'gbp', Y2018.from, Y2018.to).catch((e) => e);
    expect(err).toBeInstanceOf(PriceHistoryError);
    expect(err).toMatchObject({ status: 503, retryAfterS: 1 });
    expect(upstream).toHaveBeenCalledTimes(2);

    // Cached spans still serve while the budget is empty.
    await expect(getPriceHistory('bitcoin', 'eur', Y2018.from, Y2018.to)).resolves.toBeDefined();

    nowMs += 1000;
    await expect(getPriceHistory('bitcoin', 'gbp', Y2018.from, Y2018.to)).resolves.toBeDefined();
    expect(upstream).toHaveBeenCalledTimes(3);
  });

  it('enforces the daily budget', async () => {
    config.priceHistory.upstreamPerDay = 2;
    resetPriceHistoryState();
    const upstream = mockUpstream();
    await getPriceHistory('bitcoin', 'eur', Y2018.from, Y2018.to);
    await getPriceHistory('bitcoin', 'usd', Y2018.from, Y2018.to);
    nowMs += 60 * 1000; // the per-minute bucket has refilled; the daily one has not
    const err = await getPriceHistory('bitcoin', 'gbp', Y2018.from, Y2018.to).catch((e) => e);
    expect(err).toMatchObject({ status: 503 });
    expect(err.retryAfterS).toBeGreaterThan(60);
    expect(upstream).toHaveBeenCalledTimes(2);
  });

  it('caps concurrent upstream calls and answers 503 instead of queueing', async () => {
    config.priceHistory.maxConcurrentUpstream = 1;
    resetPriceHistoryState();
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const upstream = mockUpstream(async (...args) => {
      await gate;
      return fakeRange(...args);
    });
    const first = getPriceHistory('bitcoin', 'eur', Y2018.from, Y2018.to);
    const second = await getPriceHistory('ethereum', 'eur', Y2018.from, Y2018.to).catch((e) => e);
    expect(second).toMatchObject({ status: 503, retryAfterS: 1 });
    release();
    await first;
    expect(upstream).toHaveBeenCalledTimes(1);
    await expect(getPriceHistory('ethereum', 'eur', Y2018.from, Y2018.to)).resolves.toBeDefined();
  });

  it('enters a cooldown on an upstream 429, honouring Retry-After, with no upstream calls during it', async () => {
    const upstream = mockUpstream(async () => { throw upstreamError(429, { 'retry-after': '30' }); });
    const limited = await callHandler('bitcoin', { vs: 'eur', from: String(Y2018.from), to: String(Y2018.to) });
    expect(limited.statusCode).toBe(503);
    expect(limited.headers['retry-after']).toBe('30');
    expect(upstream).toHaveBeenCalledTimes(1);

    upstream.mockImplementation(async (...args) => fakeRange(...args));
    nowMs += 10 * 1000;
    const during = await callHandler('ethereum', { vs: 'usd', from: String(Y2018.from), to: String(Y2018.to) });
    expect(during.statusCode).toBe(503);
    expect(during.headers['retry-after']).toBe('20');
    expect(upstream).toHaveBeenCalledTimes(1);

    nowMs += 21 * 1000;
    const after = await callHandler('bitcoin', { vs: 'eur', from: String(Y2018.from), to: String(Y2018.to) });
    expect(after.statusCode).toBe(200);
    expect(upstream).toHaveBeenCalledTimes(2);
  });

  it('uses a default cooldown when a 429 carries no Retry-After', async () => {
    mockUpstream(async () => { throw upstreamError(429); });
    const err = await getPriceHistory('bitcoin', 'eur', Y2018.from, Y2018.to).catch((e) => e);
    expect(err).toMatchObject({ status: 503, retryAfterS: config.priceHistory.defaultCooldownMs / 1000 });
  });

  it('maps an upstream 5xx or network failure to 502 without caching it', async () => {
    const upstream = mockUpstream(async () => { throw upstreamError(500); });
    const failed = await callHandler('bitcoin', { vs: 'eur', from: String(Y2018.from), to: String(Y2018.to) });
    expect(failed.statusCode).toBe(502);

    upstream.mockImplementation(async () => { throw new Error('socket hang up'); });
    const network = await callHandler('bitcoin', { vs: 'eur', from: String(Y2018.from), to: String(Y2018.to) });
    expect(network.statusCode).toBe(502);

    upstream.mockImplementation(async (...args) => fakeRange(...args));
    const retried = await callHandler('bitcoin', { vs: 'eur', from: String(Y2018.from), to: String(Y2018.to) });
    expect(retried.statusCode).toBe(200);
    expect(upstream).toHaveBeenCalledTimes(3);
  });
});
