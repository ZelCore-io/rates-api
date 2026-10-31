import { CoinGecko } from '../src/services/providers/coinGecko';
import { CoinPaprika } from '../src/services/providers/coinPaprika';
import {
  getMarketChart, getSimplePrice, getSupportedVsCurrencies, MirrorError, parseMarketChartParams, parseSimplePriceParams, resetBlockbookMirrorState,
} from '../src/services/blockbookMirror';
import config from '../config';
import { isSupportedId } from '../src/services/priceHistory';

jest.mock('../src/services/providers/coinGecko');
jest.mock('../src/services/providers/coinPaprika');
jest.mock('../src/lib/log');

const MockedCoinGecko = CoinGecko as jest.Mocked<typeof CoinGecko>;
const MockedCoinPaprika = CoinPaprika as jest.Mocked<typeof CoinPaprika>;

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;
const DEFAULTS = JSON.parse(JSON.stringify(config.blockbookMirror));
const SINCE_MS = Date.parse('2026-07-20T00:00:00Z');
const BTG_SINCE_MS = Date.parse('2026-07-27T00:00:00Z');
/** 2026-10-27 13:37 UTC, after the groestlcoin fallback's `since`. */
const NOW_MS = Date.parse('2026-10-27T13:37:00Z');
const TODAY_MS = Math.floor(NOW_MS / DAY_MS) * DAY_MS;

let nowMs: number;

/** Daily points at 00:00 UTC from `fromMs` to today, plus CoinGecko's trailing "now" point. */
function dailySeries(fromMs: number, price: (dayMs: number) => number | null, toMs = TODAY_MS): [number, number | null][] {
  const out: [number, number | null][] = [];
  for (let t = fromMs; t <= toMs; t += DAY_MS) out.push([t, price(t)]);
  out.push([nowMs, price(toMs)]);
  return out;
}

function upstreamError(status: number, headers: Record<string, string> = {}): Error {
  return Object.assign(new Error(`Request failed with status code ${status}`), { isAxiosError: true, response: { status, headers } });
}

const SUPPORTED = ['btc', 'eth', 'usd', 'eur', 'gbp', 'sats'];
/** Bitcoin: 60000 usd, 50000 eur; CoinGecko's bitcoin/btc quote drifts off 1. */
const BTC_NOW: Record<string, number> = {
  btc: 1.0003, eth: 20, usd: 60000, eur: 50000, gbp: 45000, sats: 1e8,
};

function mockGecko(overrides: Partial<Record<'getSupportedVsCurrencies' | 'getSimplePrice' | 'getMarketChart', jest.Mock>> = {}) {
  const gecko = {
    getSupportedVsCurrencies: jest.fn(async () => SUPPORTED),
    getSimplePrice: jest.fn(async (ids: string[], vs: string[]) => Object.fromEntries(ids.map((id) => [
      id, Object.fromEntries(vs.map((v) => [v, id === 'bitcoin' ? BTC_NOW[v] : 2])),
    ]))),
    getMarketChart: jest.fn(async (id: string, vs: string, days: number | 'max', interval?: string) => {
      if (interval === 'daily') {
        // Bitcoin Gold froze on 2026-07-27 at 0.2338: the point is there, but it is the stale one.
        if (id === 'bitcoin-gold') return { prices: dailySeries(Date.parse('2017-10-23T00:00:00Z'), (t) => (t === BTG_SINCE_MS ? 0.2338 : 0.25), BTG_SINCE_MS) };
        if (id === 'groestlcoin') return { prices: dailySeries(Date.parse('2014-04-11T00:00:00Z'), () => 0.3, Date.parse('2026-07-19T00:00:00Z')) };
        // Bitcoin: usd 60000, eur 50000 every day; one missing usd day.
        const value = BTC_NOW[vs];
        return { prices: dailySeries(Date.parse('2013-04-28T00:00:00Z'), (t) => (vs === 'usd' && t === TODAY_MS - 10 * DAY_MS ? null : value)) };
      }
      const step = (days as number) <= 1 ? 5 * MINUTE_MS : 60 * MINUTE_MS;
      const prices: [number, number | null][] = [];
      for (let t = nowMs - (days as number) * DAY_MS; t <= nowMs; t += step) prices.push([t, 1]);
      prices.push([nowMs, null]);
      return { prices, market_caps: [], total_volumes: [] };
    }),
    ...overrides,
  };
  MockedCoinGecko.getInstance.mockReturnValue(gecko as never);
  return gecko;
}

function mockPaprika(overrides: Partial<Record<'getTicker' | 'getHistorical', jest.Mock>> = {}) {
  const paprika = {
    getTicker: jest.fn(async () => ({ quotes: { USD: { price: 0.6 } } })),
    getHistorical: jest.fn(async (id: string, start: string, interval: string) => {
      const out: { timestamp: string; price: number | null }[] = [];
      if (interval === '1d') {
        for (let t = Date.parse(`${start}T00:00:00Z`); t <= Math.floor(nowMs / DAY_MS) * DAY_MS; t += DAY_MS) out.push({ timestamp: new Date(t).toISOString().replace('.000Z', 'Z'), price: 0.6 });
      } else {
        const first = Math.ceil((Number(start) * 1000) / (60 * MINUTE_MS)) * 60 * MINUTE_MS;
        for (let t = first; t <= nowMs; t += 60 * MINUTE_MS) out.push({ timestamp: new Date(t).toISOString().replace('.000Z', 'Z'), price: 0.6 });
      }
      return out;
    }),
    ...overrides,
  };
  MockedCoinPaprika.getInstance.mockReturnValue(paprika as never);
  return paprika;
}

async function expectMirrorError(promise: Promise<unknown>, status: number, retryAfterS?: number): Promise<MirrorError> {
  const error = await promise.then(() => undefined, (e) => e);
  expect(error).toBeInstanceOf(MirrorError);
  expect(error.status).toBe(status);
  if (retryAfterS !== undefined) expect(error.retryAfterS).toBe(retryAfterS);
  return error;
}

const chart = (id: string, vs: string, days: string, interval?: string) => getMarketChart(parseMarketChartParams(id, vs, days, interval));

beforeEach(() => {
  nowMs = NOW_MS;
  jest.spyOn(Date, 'now').mockImplementation(() => nowMs);
  Object.assign(config.blockbookMirror, JSON.parse(JSON.stringify(DEFAULTS)));
  jest.clearAllMocks();
  resetBlockbookMirrorState();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('simple/supported_vs_currencies', () => {
  it('serves CoinGecko\'s list, cached for 24 hours', async () => {
    const gecko = mockGecko();
    await expect(getSupportedVsCurrencies()).resolves.toEqual(SUPPORTED);
    nowMs += DAY_MS - 1000;
    await getSupportedVsCurrencies();
    expect(gecko.getSupportedVsCurrencies).toHaveBeenCalledTimes(1);
    nowMs += 2000;
    await getSupportedVsCurrencies();
    expect(gecko.getSupportedVsCurrencies).toHaveBeenCalledTimes(2);
  });

  it('falls back to the static list before CoinGecko has ever answered, and retries after 5 minutes', async () => {
    const gecko = mockGecko({ getSupportedVsCurrencies: jest.fn(async () => { throw upstreamError(500); }) });
    const list = await getSupportedVsCurrencies();
    expect(list).toEqual(expect.arrayContaining(['usd', 'eur', 'btc', 'eth', 'vef']));
    expect(list).not.toContain('sats');
    await getSupportedVsCurrencies();
    expect(gecko.getSupportedVsCurrencies).toHaveBeenCalledTimes(1);

    nowMs += config.blockbookMirror.supportedVsRetryMs + 1;
    gecko.getSupportedVsCurrencies.mockImplementation(async () => SUPPORTED);
    await expect(getSupportedVsCurrencies()).resolves.toEqual(SUPPORTED);
    expect(gecko.getSupportedVsCurrencies).toHaveBeenCalledTimes(2);
  });

  it('keeps serving the last good list when a refresh fails', async () => {
    const gecko = mockGecko();
    await getSupportedVsCurrencies();
    nowMs += DAY_MS + 1;
    gecko.getSupportedVsCurrencies.mockImplementation(async () => { throw upstreamError(502); });
    await expect(getSupportedVsCurrencies()).resolves.toEqual(SUPPORTED);
  });
});

describe('simple/price parameter validation', () => {
  it.each([
    ['missing ids', undefined, 'usd'],
    ['a repeated ids parameter', ['bitcoin', 'litecoin'], 'usd'],
    ['an empty id', 'bitcoin,,litecoin', 'usd'],
    ['a malformed id', 'Bitcoin!', 'usd'],
    ['11 ids', Array.from({ length: 11 }, (_, i) => `coin-${i}`).join(','), 'usd'],
    ['missing vs_currencies', 'bitcoin', undefined],
    ['61 vs currencies', 'bitcoin', Array.from({ length: 61 }, (_, i) => `c${i}`).join(',')],
  ])('rejects %s with 400', (_label, ids, vs) => {
    expect(() => parseSimplePriceParams(ids, vs)).toThrow(expect.objectContaining({ status: 400 }));
  });

  it('accepts 10 ids and 60 vs currencies, lowercased and deduplicated', () => {
    const ids = Array.from({ length: 10 }, (_, i) => `coin-${i}`).join(',');
    const vs = Array.from({ length: 60 }, (_, i) => `C${i}`).join(',');
    const parsed = parseSimplePriceParams(`${ids},coin-0`, vs);
    expect(parsed.ids).toHaveLength(10);
    expect(parsed.vs[0]).toBe('c0');
  });

  it.each(['definitely-not-listed', 'monero', 'ethereum'])('answers 404 coin not found for %s (not a configured explorer coin), without any upstream call', async (id) => {
    const gecko = mockGecko();
    const paprika = mockPaprika();
    const error = await expectMirrorError(getSimplePrice(['bitcoin', id], ['usd']), 404);
    expect(error.message).toBe('coin not found');
    await expectMirrorError(chart(id, 'usd', '1', 'daily'), 404);
    await expectMirrorError(chart(id, 'usd', '1'), 404);
    expect(gecko.getSupportedVsCurrencies).not.toHaveBeenCalled();
    expect(gecko.getSimplePrice).not.toHaveBeenCalled();
    expect(gecko.getMarketChart).not.toHaveBeenCalled();
    expect(paprika.getTicker).not.toHaveBeenCalled();
    expect(paprika.getHistorical).not.toHaveBeenCalled();
  });

  it('answers 400 for a vs currency that is not supported', async () => {
    const gecko = mockGecko();
    await expectMirrorError(getSimplePrice(['bitcoin'], ['usd', 'xyz']), 400);
    expect(gecko.getSimplePrice).not.toHaveBeenCalled();
  });
});

describe('simple/price', () => {
  it('asks CoinGecko once per id for every supported currency, cached 5 min, and answers any subset from it', async () => {
    const gecko = mockGecko();
    await expect(getSimplePrice(['bitcoin'], ['usd', 'eur'])).resolves.toEqual({ bitcoin: { eur: 50000, usd: 60000 } });
    expect(gecko.getSimplePrice).toHaveBeenCalledWith(['bitcoin'], [...SUPPORTED].sort());

    // Every other subset, order and mix with a fallback coin is served from the same call.
    await expect(getSimplePrice(['bitcoin'], ['gbp'])).resolves.toEqual({ bitcoin: { gbp: 45000 } });
    await getSimplePrice(['bitcoin'], ['sats', 'eth', 'btc', 'usd', 'eur', 'gbp']);
    await getSimplePrice(['bitcoin'], ['eur', 'usd']);
    mockPaprika();
    await getSimplePrice(['groestlcoin', 'bitcoin'], ['eur']);
    expect(gecko.getSimplePrice).toHaveBeenCalledTimes(1);

    nowMs += 5 * MINUTE_MS + 1;
    await getSimplePrice(['bitcoin'], ['eth']);
    expect(gecko.getSimplePrice).toHaveBeenCalledTimes(2);
  });

  it('drops null and missing prices', async () => {
    mockGecko({ getSimplePrice: jest.fn(async () => ({ bitcoin: { usd: null, eur: 5 } })) });
    await expect(getSimplePrice(['bitcoin'], ['usd', 'eur'])).resolves.toEqual({ bitcoin: { eur: 5 } });
  });

  it('prices a fallback coin from CoinPaprika USD through the current Bitcoin cross, never asking CoinGecko for it', async () => {
    const gecko = mockGecko();
    const paprika = mockPaprika();
    const out = await getSimplePrice(['groestlcoin'], ['usd', 'eur', 'btc', 'sats']);
    expect(out.groestlcoin.usd).toBeCloseTo(0.6);
    expect(out.groestlcoin.eur).toBeCloseTo(0.6 * (50000 / 60000));
    // Exactly usd / bitcoin.usd, not through CoinGecko's drifting bitcoin/btc quote.
    expect(out.groestlcoin.btc).toBeCloseTo(0.6 / 60000, 12);
    expect(out.groestlcoin.sats).toBeCloseTo((0.6 / 60000) * 1e8);
    expect(paprika.getTicker).toHaveBeenCalledWith('grs-groestlcoin');
    gecko.getSimplePrice.mock.calls.forEach(([ids]) => expect(ids).toEqual(['bitcoin']));
  });

  it('caches the CoinPaprika ticker for 10 minutes and the Bitcoin cross for 5 min', async () => {
    const gecko = mockGecko();
    const paprika = mockPaprika();
    await getSimplePrice(['groestlcoin'], ['eur']);
    await getSimplePrice(['groestlcoin'], ['usd', 'gbp']);
    expect(paprika.getTicker).toHaveBeenCalledTimes(1);
    expect(gecko.getSimplePrice).toHaveBeenCalledTimes(1);

    nowMs += 5 * MINUTE_MS + 1;
    await getSimplePrice(['groestlcoin'], ['eur']);
    expect(gecko.getSimplePrice).toHaveBeenCalledTimes(2);
    expect(paprika.getTicker).toHaveBeenCalledTimes(1);

    nowMs += 10 * MINUTE_MS;
    await getSimplePrice(['groestlcoin'], ['eur']);
    expect(paprika.getTicker).toHaveBeenCalledTimes(2);
  });

  it('needs no Bitcoin cross for a usd-only fallback request', async () => {
    const gecko = mockGecko();
    mockPaprika();
    await expect(getSimplePrice(['groestlcoin'], ['usd'])).resolves.toEqual({ groestlcoin: { usd: 0.6 } });
    expect(gecko.getSimplePrice).not.toHaveBeenCalled();
  });
});

describe('market_chart parameter validation', () => {
  it.each([
    ['days 0 (daily)', '0', 'daily'],
    ['days 36501 (daily)', '36501', 'daily'],
    ['fractional days', '1.5', 'daily'],
    ['days 91 without interval', '91', undefined],
    ['days 7 without interval', '7', undefined],
    ['days 2 without interval', '2', undefined],
    ['days 89 without interval', '89', undefined],
    ['days max without interval', 'max', undefined],
    ['an unknown interval', '1', 'hourly'],
    ['a repeated days parameter', ['1', '2'], 'daily'],
  ])('rejects %s with 400', (_label, days, interval) => {
    expect(() => parseMarketChartParams('bitcoin', 'usd', days, interval)).toThrow(expect.objectContaining({ status: 400 }));
  });

  it('accepts days max and 36500 with interval=daily, and 1 and 90 without', () => {
    expect(parseMarketChartParams('bitcoin', 'USD', 'max', 'daily')).toEqual({
      id: 'bitcoin', vs: 'usd', days: 'max', interval: 'daily',
    });
    expect(parseMarketChartParams('bitcoin', 'usd', '36500', 'daily').days).toBe(36500);
    expect(parseMarketChartParams('bitcoin', 'usd', '1', undefined)).toEqual({ id: 'bitcoin', vs: 'usd', days: 1 });
    expect(parseMarketChartParams('bitcoin', 'usd', '90', undefined).days).toBe(90);
  });

  it('answers 404 for an unserved id and 400 for an unsupported vs, without an upstream call', async () => {
    const gecko = mockGecko();
    await expectMirrorError(chart('definitely-not-listed', 'usd', '1', 'daily'), 404);
    await expectMirrorError(chart('bitcoin', 'xyz', '1', 'daily'), 400);
    expect(gecko.getMarketChart).not.toHaveBeenCalled();
  });
});

describe('market_chart interval=daily', () => {
  it('slices one cached full series per (id, vs) and drops null prices', async () => {
    const gecko = mockGecko();
    const all = await chart('bitcoin', 'eur', 'max', 'daily');
    expect(all.prices[0]).toEqual([Date.parse('2013-04-28T00:00:00Z'), 50000]);

    const week = await chart('bitcoin', 'eur', '7', 'daily');
    expect(week.prices.every(([ts]) => ts >= nowMs - 7 * DAY_MS)).toBe(true);
    expect(week.prices.filter(([ts]) => ts % DAY_MS === 0)).toHaveLength(7);
    expect(gecko.getMarketChart).toHaveBeenCalledTimes(1);
    expect(gecko.getMarketChart).toHaveBeenCalledWith('bitcoin', 'eur', 'max', 'daily');

    const usd = await chart('bitcoin', 'usd', 'max', 'daily');
    expect(usd.prices.some(([ts]) => ts === TODAY_MS - 10 * DAY_MS)).toBe(false);
  });

  it('stays fresh until the next 00:20 UTC, then refetches', async () => {
    const gecko = mockGecko();
    await chart('bitcoin', 'eur', '30', 'daily');
    nowMs = TODAY_MS + DAY_MS + 19 * MINUTE_MS;
    await chart('bitcoin', 'eur', '30', 'daily');
    expect(gecko.getMarketChart).toHaveBeenCalledTimes(1);
    nowMs = TODAY_MS + DAY_MS + 20 * MINUTE_MS;
    await chart('bitcoin', 'eur', '30', 'daily');
    expect(gecko.getMarketChart).toHaveBeenCalledTimes(2);
  });

  it('a series fetched between 00:00 and 00:20 UTC expires at 00:20 the same day', async () => {
    const gecko = mockGecko();
    nowMs = TODAY_MS + 5 * MINUTE_MS;
    await chart('bitcoin', 'eur', '30', 'daily');
    nowMs = TODAY_MS + 21 * MINUTE_MS;
    await chart('bitcoin', 'eur', '30', 'daily');
    expect(gecko.getMarketChart).toHaveBeenCalledTimes(2);
  });

  it('re-asks every 10 minutes while the series lacks today\'s 00:00 point, then keeps it until the next 00:20', async () => {
    const gecko = mockGecko();
    const original = gecko.getMarketChart.getMockImplementation()!;
    // Not yet published: the series ends with yesterday's 00:00 point (plus the "now" point).
    gecko.getMarketChart.mockImplementationOnce(async () => ({ prices: dailySeries(Date.parse('2013-04-28T00:00:00Z'), () => 50000, TODAY_MS - DAY_MS) }));
    const first = await chart('bitcoin', 'eur', '2', 'daily');
    expect(first.prices.some(([ts]) => ts === TODAY_MS)).toBe(false);
    nowMs += 10 * MINUTE_MS - 1;
    await chart('bitcoin', 'eur', '2', 'daily');
    expect(gecko.getMarketChart).toHaveBeenCalledTimes(1);
    nowMs += 1;
    const second = await chart('bitcoin', 'eur', '2', 'daily');
    expect(gecko.getMarketChart).toHaveBeenCalledTimes(2);
    expect(second.prices.some(([ts]) => ts === TODAY_MS)).toBe(true);

    // Complete now: kept until the next 00:20 UTC.
    gecko.getMarketChart.mockImplementation(original);
    nowMs = TODAY_MS + DAY_MS + 19 * MINUTE_MS;
    await chart('bitcoin', 'eur', '2', 'daily');
    expect(gecko.getMarketChart).toHaveBeenCalledTimes(2);
  });

  it('keeps a series fetched before 00:20 UTC that holds yesterday\'s point until 00:20', async () => {
    const gecko = mockGecko();
    nowMs = TODAY_MS + 5 * MINUTE_MS;
    gecko.getMarketChart.mockImplementationOnce(async () => ({ prices: dailySeries(Date.parse('2013-04-28T00:00:00Z'), () => 50000, TODAY_MS - DAY_MS) }));
    await chart('bitcoin', 'eur', '2', 'daily');
    nowMs = TODAY_MS + 19 * MINUTE_MS;
    await chart('bitcoin', 'eur', '2', 'daily');
    expect(gecko.getMarketChart).toHaveBeenCalledTimes(1);
  });

  it('bounds the daily cache by point count', async () => {
    config.blockbookMirror.dailySeriesMaxPoints = 10_000;
    resetBlockbookMirrorState();
    const gecko = mockGecko();
    await chart('bitcoin', 'eur', '1', 'daily');
    await chart('bitcoin', 'gbp', '1', 'daily');
    await chart('bitcoin', 'usd', '1', 'daily');
    // Three ~4900-point series don't fit in 10k: the oldest was evicted.
    await chart('bitcoin', 'eur', '1', 'daily');
    expect(gecko.getMarketChart).toHaveBeenCalledTimes(4);
  });
});

describe('market_chart interval=daily for a fallback coin', () => {
  it('stitches CoinGecko history before `since` to CoinPaprika days converted with Bitcoin\'s daily price', async () => {
    const gecko = mockGecko();
    const paprika = mockPaprika();
    const { prices } = await chart('groestlcoin', 'eur', 'max', 'daily');

    const before = prices.filter(([ts]) => ts < SINCE_MS);
    const after = prices.filter(([ts]) => ts >= SINCE_MS);
    expect(before[0]).toEqual([Date.parse('2014-04-11T00:00:00Z'), 0.3]);
    expect(before[before.length - 1]).toEqual([Date.parse('2026-07-19T00:00:00Z'), 0.3]);
    expect(after[0][0]).toBe(SINCE_MS);
    expect(after[0][1]).toBeCloseTo(0.6 * (50000 / 60000));
    // Every point is a UTC midnight: CoinGecko's frozen "now" point is not carried over.
    expect(prices.every(([ts]) => ts % DAY_MS === 0)).toBe(true);
    // The day without a Bitcoin usd point is skipped.
    expect(after.some(([ts]) => ts === TODAY_MS - 10 * DAY_MS)).toBe(false);
    expect(after).toHaveLength((TODAY_MS - SINCE_MS) / DAY_MS + 1 - 1);

    expect(paprika.getHistorical).toHaveBeenCalledWith('grs-groestlcoin', '2026-07-20', '1d', 'usd');
    expect(gecko.getMarketChart.mock.calls.map((c) => `${c[0]}/${c[1]}`).sort()).toEqual(['bitcoin/eur', 'bitcoin/usd', 'groestlcoin/eur']);
  });

  it('starts CoinPaprika at now - 364 days once `since` is older than that', async () => {
    mockGecko();
    const paprika = mockPaprika();
    nowMs = Date.parse('2028-01-01T12:00:00Z');
    await chart('groestlcoin', 'usd', '30', 'daily');
    expect(paprika.getHistorical).toHaveBeenCalledWith('grs-groestlcoin', '2027-01-02', '1d', 'usd');
  });

  it('needs no Bitcoin series for usd, and only Bitcoin usd for btc', async () => {
    const gecko = mockGecko();
    mockPaprika();
    const usd = await chart('groestlcoin', 'usd', 'max', 'daily');
    expect(usd.prices.find(([ts]) => ts === SINCE_MS)).toEqual([SINCE_MS, 0.6]);
    expect(gecko.getMarketChart.mock.calls.map((c) => c[0])).toEqual(['groestlcoin']);

    const btc = await chart('groestlcoin', 'btc', 'max', 'daily');
    expect(btc.prices.find(([ts]) => ts === SINCE_MS)![1]).toBeCloseTo(0.6 / 60000);
    expect(gecko.getMarketChart.mock.calls.map((c) => `${c[0]}/${c[1]}`)).toEqual(['groestlcoin/usd', 'groestlcoin/btc', 'bitcoin/usd']);
  });

  it.each([
    ['a 404', upstreamError(404)],
    ['a 500', upstreamError(500)],
  ])('answers 502 (not a partial 200) when CoinGecko answers %s for the pre-`since` history, and retries next time', async (_label, failure) => {
    const gecko = mockGecko();
    const original = gecko.getMarketChart.getMockImplementation()!;
    gecko.getMarketChart.mockImplementationOnce(async () => { throw failure; });
    mockPaprika();
    await expectMirrorError(chart('groestlcoin', 'usd', 'max', 'daily'), 502);
    gecko.getMarketChart.mockImplementation(original);
    const { prices } = await chart('groestlcoin', 'usd', 'max', 'daily');
    expect(prices[0]).toEqual([Date.parse('2014-04-11T00:00:00Z'), 0.3]);
    expect(gecko.getMarketChart.mock.calls.filter((c) => c[0] === 'groestlcoin')).toHaveLength(2);
  });

  it('keeps a CoinGecko 429 for the history a 429', async () => {
    const gecko = mockGecko();
    await getSupportedVsCurrencies();
    gecko.getMarketChart.mockImplementationOnce(async () => { throw upstreamError(429, { 'retry-after': '30' }); });
    mockPaprika();
    await expectMirrorError(chart('groestlcoin', 'usd', 'max', 'daily'), 429, 30);
  });

  it('never asks CoinGecko for the pre-`since` history when the window starts on or after `since`', async () => {
    const gecko = mockGecko();
    mockPaprika();
    const day = await chart('groestlcoin', 'eur', '1', 'daily');
    expect(day.prices.length).toBeGreaterThan(0);
    await chart('groestlcoin', 'usd', '2', 'daily');
    // now - 99 days is 2026-07-20 13:37, after `since`.
    await chart('groestlcoin', 'gbp', '99', 'daily');
    expect(gecko.getMarketChart.mock.calls.filter((c) => c[0] === 'groestlcoin')).toHaveLength(0);

    // A window reaching before `since` (and max) does fetch it.
    await chart('groestlcoin', 'usd', '100', 'daily');
    expect(gecko.getMarketChart.mock.calls.filter((c) => c[0] === 'groestlcoin').map((c) => c[1])).toEqual(['usd']);
  });

  it('re-asks CoinPaprika after 10 minutes while its daily series lacks today\'s 00:00 point', async () => {
    mockGecko();
    const paprika = mockPaprika();
    const original = paprika.getHistorical.getMockImplementation()!;
    paprika.getHistorical.mockImplementationOnce(async (id: string, start: string, interval: string) => (await original(id, start, interval)).slice(0, -1));
    await chart('groestlcoin', 'usd', '7', 'daily');
    nowMs += 10 * MINUTE_MS - 1;
    await chart('groestlcoin', 'usd', '7', 'daily');
    expect(paprika.getHistorical).toHaveBeenCalledTimes(1);
    nowMs += 1;
    await chart('groestlcoin', 'usd', '7', 'daily');
    expect(paprika.getHistorical).toHaveBeenCalledTimes(2);
    // Complete: no refetch for hours.
    nowMs += 6 * 60 * MINUTE_MS;
    await chart('groestlcoin', 'usd', '7', 'daily');
    expect(paprika.getHistorical).toHaveBeenCalledTimes(2);
  });

  it('keeps the frozen CoinGecko history until the next 00:20 UTC even though it has no recent point', async () => {
    const gecko = mockGecko();
    mockPaprika();
    await chart('groestlcoin', 'usd', 'max', 'daily');
    nowMs += 6 * 60 * MINUTE_MS;
    await chart('groestlcoin', 'usd', 'max', 'daily');
    expect(gecko.getMarketChart.mock.calls.filter((c) => c[0] === 'groestlcoin')).toHaveLength(1);
  });

  it('shares the CoinPaprika daily series across currencies', async () => {
    mockGecko();
    const paprika = mockPaprika();
    await chart('groestlcoin', 'eur', 'max', 'daily');
    await chart('groestlcoin', 'gbp', 'max', 'daily');
    await chart('groestlcoin', 'usd', '7', 'daily');
    expect(paprika.getHistorical).toHaveBeenCalledTimes(1);
  });
});

describe('market_chart without interval', () => {
  it('passes days through to CoinGecko, returns prices only, and caches 15 min for days <= 1', async () => {
    const gecko = mockGecko();
    const out = await chart('bitcoin', 'usd', '1');
    expect(Object.keys(out)).toEqual(['prices']);
    expect(out.prices.every(([, price]) => price !== null)).toBe(true);
    expect(gecko.getMarketChart).toHaveBeenCalledWith('bitcoin', 'usd', 1);
    nowMs += 15 * MINUTE_MS - 1;
    await chart('bitcoin', 'usd', '1');
    expect(gecko.getMarketChart).toHaveBeenCalledTimes(1);
    nowMs += 2;
    await chart('bitcoin', 'usd', '1');
    expect(gecko.getMarketChart).toHaveBeenCalledTimes(2);
  });

  it('caches 6 hours for days 90', async () => {
    const gecko = mockGecko();
    await chart('bitcoin', 'usd', '90');
    nowMs += 6 * 60 * MINUTE_MS - 1;
    await chart('bitcoin', 'usd', '90');
    expect(gecko.getMarketChart).toHaveBeenCalledTimes(1);
    nowMs += 2;
    await chart('bitcoin', 'usd', '90');
    expect(gecko.getMarketChart).toHaveBeenCalledTimes(2);
  });

  it('serves a fallback coin CoinPaprika hourly points from now - 23 h at the current cross, cached 30 min', async () => {
    const gecko = mockGecko();
    const paprika = mockPaprika();
    const { prices } = await chart('groestlcoin', 'eur', '1');
    expect(paprika.getHistorical).toHaveBeenCalledWith('grs-groestlcoin', String(Math.floor((nowMs - 23 * 3600_000) / 1000)), '1h', 'usd');
    expect(prices.length).toBeGreaterThanOrEqual(22);
    prices.forEach(([, price]) => expect(price).toBeCloseTo(0.6 * (50000 / 60000)));
    expect(gecko.getMarketChart).not.toHaveBeenCalled();

    await chart('groestlcoin', 'usd', '90');
    nowMs += 30 * MINUTE_MS - 1;
    await chart('groestlcoin', 'usd', '1');
    expect(paprika.getHistorical).toHaveBeenCalledTimes(1);
    nowMs += 2;
    await chart('groestlcoin', 'usd', '1');
    expect(paprika.getHistorical).toHaveBeenCalledTimes(2);
  });
});

describe('upstream budget, cooldown and failures', () => {
  it('answers 429 + Retry-After once the CoinGecko burst is spent, without an upstream call', async () => {
    config.blockbookMirror.coinGecko = { perMinute: 30, burst: 10, perDay: 3000 };
    resetBlockbookMirrorState();
    const gecko = mockGecko();
    await getSupportedVsCurrencies(); // 1 call
    const keys = [...SUPPORTED.map((vs) => [vs, '1']), ['usd', '90'], ['eur', '90'], ['gbp', '90']];
    // eslint-disable-next-line no-restricted-syntax -- sequential: each must be admitted on its own.
    for (const [vs, days] of keys) {
      // eslint-disable-next-line no-await-in-loop
      await chart('bitcoin', vs, days);
    }
    expect(gecko.getMarketChart).toHaveBeenCalledTimes(9);
    // 30/min refill: the next token is 2 s away.
    await expectMirrorError(chart('bitcoin', 'btc', '90'), 429, 2);
    expect(gecko.getMarketChart).toHaveBeenCalledTimes(9);
    // Cached answers are still served.
    await expect(chart('bitcoin', 'eur', '90')).resolves.toBeDefined();

    nowMs += 2000;
    await expect(chart('bitcoin', 'btc', '90')).resolves.toBeDefined();
  });

  it('answers 429 once the CoinGecko daily budget is spent', async () => {
    config.blockbookMirror.coinGecko = { perMinute: 1000, burst: 1000, perDay: 3 };
    resetBlockbookMirrorState();
    mockGecko();
    await getSupportedVsCurrencies();
    await chart('bitcoin', 'usd', '1');
    await chart('bitcoin', 'usd', '90');
    const error = await expectMirrorError(chart('bitcoin', 'eur', '1'), 429);
    expect(error.retryAfterS).toBeGreaterThan(60);
  });

  it('keeps a separate CoinPaprika budget', async () => {
    config.blockbookMirror.coinPaprika = { perDay: 600, burst: 1 };
    resetBlockbookMirrorState();
    mockGecko();
    mockPaprika();
    await getSimplePrice(['groestlcoin'], ['usd']);
    await expectMirrorError(chart('groestlcoin', 'usd', '1'), 429, 144);
    // CoinGecko is unaffected.
    await expect(chart('bitcoin', 'usd', '1')).resolves.toBeDefined();
  });

  it('cools down after an upstream 429, honouring its Retry-After', async () => {
    const gecko = mockGecko();
    await getSupportedVsCurrencies();
    gecko.getMarketChart.mockImplementationOnce(async () => { throw upstreamError(429, { 'retry-after': '120' }); });
    await expectMirrorError(chart('bitcoin', 'usd', '1'), 429, 120);
    await expectMirrorError(chart('bitcoin', 'eur', '1'), 429, 120);
    expect(gecko.getMarketChart).toHaveBeenCalledTimes(1);
    nowMs += 120_000;
    await expect(chart('bitcoin', 'eur', '1')).resolves.toBeDefined();
  });

  it('answers 502 on an upstream failure and caches nothing', async () => {
    const gecko = mockGecko();
    gecko.getMarketChart.mockImplementationOnce(async () => { throw upstreamError(500); });
    const error = await expectMirrorError(chart('bitcoin', 'usd', '1', 'daily'), 502);
    expect(error.message).toBe('Upstream unavailable');
    expect(error.reason).toBe('CoinGecko daily bitcoin|usd failed: 500');
    await expect(chart('bitcoin', 'usd', '1', 'daily')).resolves.toBeDefined();
    expect(gecko.getMarketChart).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['daily, empty prices', () => chart('bitcoin', 'usd', 'max', 'daily'), 'getMarketChart', async () => ({ prices: [] })],
    ['daily, all-null prices', () => chart('bitcoin', 'usd', '1', 'daily'), 'getMarketChart', async () => ({ prices: [[TODAY_MS, null]] })],
    ['daily, malformed body', () => chart('bitcoin', 'usd', '1', 'daily'), 'getMarketChart', async () => ({ error: 'x' })],
    ['intraday, empty prices', () => chart('bitcoin', 'usd', '1'), 'getMarketChart', async () => ({ prices: [] })],
    ['simple/price, coin missing', () => getSimplePrice(['bitcoin'], ['usd']), 'getSimplePrice', async () => ({})],
    ['simple/price, null prices', () => getSimplePrice(['bitcoin'], ['usd']), 'getSimplePrice', async () => ({ bitcoin: { usd: null } })],
  ])('answers 502 on an empty CoinGecko answer (%s), caches nothing, and asks again next time', async (_label, request, method, empty) => {
    const gecko = mockGecko() as unknown as Record<string, jest.Mock>;
    await getSupportedVsCurrencies();
    gecko[method].mockImplementationOnce(empty);
    const error = await expectMirrorError(request(), 502);
    expect(error.reason).toMatch(/^CoinGecko (daily|chart|price) bitcoin.*: Upstream returned no prices?$/);
    await expect(request()).resolves.toBeDefined();
    expect(gecko[method]).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['daily', '1d', () => chart('groestlcoin', 'usd', '7', 'daily')],
    ['hourly', '1h', () => chart('groestlcoin', 'usd', '1')],
  ])('answers 502 on an empty CoinPaprika %s series, caches nothing, and asks again next time', async (_label, interval, request) => {
    mockGecko();
    const paprika = mockPaprika();
    const original = paprika.getHistorical.getMockImplementation()!;
    paprika.getHistorical.mockImplementationOnce(async () => []);
    await expectMirrorError(request(), 502);
    paprika.getHistorical.mockImplementation(original);
    await expect(request()).resolves.toBeDefined();
    expect(paprika.getHistorical.mock.calls.filter((c) => c[2] === interval)).toHaveLength(2);
  });

  it('answers 502 on a CoinPaprika ticker without a price, and asks again next time', async () => {
    mockGecko();
    const paprika = mockPaprika();
    paprika.getTicker.mockImplementationOnce(async () => ({ quotes: {} }) as never);
    await expectMirrorError(getSimplePrice(['groestlcoin'], ['usd']), 502);
    await expect(getSimplePrice(['groestlcoin'], ['usd'])).resolves.toEqual({ groestlcoin: { usd: 0.6 } });
    expect(paprika.getTicker).toHaveBeenCalledTimes(2);
  });

  it('answers 404 on an upstream 404 and remembers it for 10 minutes', async () => {
    config.blockbookMirror.coins = ['bitcoin', 'groestlcoin', 'litecoin'];
    resetBlockbookMirrorState();
    const gecko = mockGecko();
    gecko.getMarketChart.mockImplementation(async () => { throw upstreamError(404); });
    const error = await expectMirrorError(chart('litecoin', 'usd', '1', 'daily'), 404);
    expect(error.message).toBe('coin not found');
    await expectMirrorError(chart('litecoin', 'usd', '1', 'daily'), 404);
    expect(gecko.getMarketChart).toHaveBeenCalledTimes(1);
    nowMs += config.blockbookMirror.notFoundCacheMs + 1;
    await expectMirrorError(chart('litecoin', 'usd', '1', 'daily'), 404);
    expect(gecko.getMarketChart).toHaveBeenCalledTimes(2);
  });

  it('coalesces identical concurrent requests into one upstream call', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const gecko = mockGecko();
    await getSupportedVsCurrencies();
    const original = gecko.getMarketChart.getMockImplementation()!;
    gecko.getMarketChart.mockImplementation(async (...args: Parameters<typeof original>) => {
      await gate;
      return original(...args);
    });
    const requests = [chart('bitcoin', 'usd', '7', 'daily'), chart('bitcoin', 'usd', '30', 'daily'), chart('bitcoin', 'usd', 'max', 'daily')];
    release();
    const [week, month, all] = await Promise.all(requests);
    expect(gecko.getMarketChart).toHaveBeenCalledTimes(1);
    expect(week.prices.length).toBeLessThan(month.prices.length);
    expect(month.prices.length).toBeLessThan(all.prices.length);
  });

  it('refuses a ninth concurrent upstream call with 429 + Retry-After 1', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const gecko = mockGecko();
    await getSupportedVsCurrencies();
    const original = gecko.getMarketChart.getMockImplementation()!;
    gecko.getMarketChart.mockImplementation(async (...args: Parameters<typeof original>) => {
      await gate;
      return original(...args);
    });
    const running = ['usd', 'eur', 'gbp', 'btc'].flatMap((vs) => ['1', '90'].map((days) => chart('bitcoin', vs, days)));
    // Let the eight reach the upstream await.
    await new Promise((resolve) => { setImmediate(resolve); });
    await expectMirrorError(chart('bitcoin', 'eth', '1'), 429, 1);
    release();
    await Promise.all(running);
    await expect(chart('bitcoin', 'eth', '1')).resolves.toBeDefined();
  });
});

describe('explorer coin allowlist', () => {
  const NEW_COINS = ['litecoin', 'zcash', 'digibyte', 'dogecoin', 'dash', 'vertcoin', 'ravencoin', 'ethereum-classic', 'bitcoin-cash', 'bitcoin-gold', 'clore-ai', 'zcoin', 'zclassic', 'zero', 'bitcoinz', 'komodo'];

  it('serves the original explorers and the 16 added coins', () => {
    expect(new Set(config.blockbookMirror.coins)).toEqual(new Set(['bitcoin', 'groestlcoin', ...NEW_COINS]));
  });

  it('only lists ids ZelCore carries, and every fallback coin is one of them', () => {
    const { coins, fallbacks } = config.blockbookMirror;
    expect(coins.filter((id) => !isSupportedId(id))).toEqual([]);
    expect(Object.keys(fallbacks).filter((id) => !coins.includes(id))).toEqual([]);
  });

  it.each(NEW_COINS.filter((id) => id !== 'bitcoin-gold'))('prices %s from CoinGecko and keeps %s\'s daily series separate', async (id) => {
    const gecko = mockGecko();
    const paprika = mockPaprika();
    await expect(getSimplePrice([id], ['usd'])).resolves.toEqual({ [id]: { usd: 2 } });
    expect(gecko.getSimplePrice).toHaveBeenCalledWith([id], expect.any(Array));
    const { prices } = await chart(id, 'usd', 'max', 'daily');
    expect(prices.length).toBeGreaterThan(1000);
    expect(gecko.getMarketChart).toHaveBeenCalledWith(id, 'usd', 'max', 'daily');
    expect(paprika.getTicker).not.toHaveBeenCalled();
  });

  it('still answers 404 for a coin that is not an explorer coin, before any upstream call', async () => {
    const gecko = mockGecko();
    await expectMirrorError(getSimplePrice(['ethereum'], ['usd']), 404);
    await expectMirrorError(chart('ethereum', 'usd', 'max', 'daily'), 404);
    expect(gecko.getSimplePrice).not.toHaveBeenCalled();
    expect(gecko.getMarketChart).not.toHaveBeenCalled();
  });
});

describe('bitcoin-gold fallback (CoinGecko froze on 2026-07-27)', () => {
  it('prices it from CoinPaprika btg-bitcoin-gold through Bitcoin, with no CoinGecko call of its own', async () => {
    const gecko = mockGecko();
    const paprika = mockPaprika();
    const out = await getSimplePrice(['bitcoin-gold'], ['usd', 'eur']);
    expect(out['bitcoin-gold'].usd).toBeCloseTo(0.6);
    expect(out['bitcoin-gold'].eur).toBeCloseTo(0.6 * (50000 / 60000));
    expect(paprika.getTicker).toHaveBeenCalledWith('btg-bitcoin-gold');
    expect(gecko.getSimplePrice.mock.calls.every((c) => c[0][0] === 'bitcoin')).toBe(true);
  });

  it('stitches CoinGecko history before 2026-07-27 to CoinPaprika days from that day, dropping the frozen 07-27 point', async () => {
    const gecko = mockGecko();
    const paprika = mockPaprika();
    const { prices } = await chart('bitcoin-gold', 'eur', 'max', 'daily');

    const before = prices.filter(([ts]) => ts < BTG_SINCE_MS);
    const after = prices.filter(([ts]) => ts >= BTG_SINCE_MS);
    expect(before[0]).toEqual([Date.parse('2017-10-23T00:00:00Z'), 0.25]);
    expect(before[before.length - 1]).toEqual([BTG_SINCE_MS - DAY_MS, 0.25]);
    expect(after[0][0]).toBe(BTG_SINCE_MS);
    expect(after[0][1]).toBeCloseTo(0.6 * (50000 / 60000));
    expect(prices.some(([, price]) => price === 0.2338)).toBe(false);
    expect(prices.every(([ts]) => ts % DAY_MS === 0)).toBe(true);
    expect(paprika.getHistorical).toHaveBeenCalledWith('btg-bitcoin-gold', '2026-07-27', '1d', 'usd');
    expect(gecko.getMarketChart.mock.calls.map((c) => `${c[0]}/${c[1]}`).sort()).toEqual(['bitcoin-gold/eur', 'bitcoin/eur', 'bitcoin/usd']);
  });

  it('serves a window after the cut-over from CoinPaprika alone', async () => {
    const gecko = mockGecko();
    mockPaprika();
    const { prices } = await chart('bitcoin-gold', 'usd', '30', 'daily');
    expect(prices.length).toBeGreaterThan(25);
    expect(prices.every(([, price]) => price === 0.6)).toBe(true);
    expect(gecko.getMarketChart).not.toHaveBeenCalled();
  });

  it('serves CoinPaprika hourly points for days=1 and days=90', async () => {
    mockGecko();
    const paprika = mockPaprika();
    const { prices } = await chart('bitcoin-gold', 'usd', '90');
    expect(prices.length).toBeGreaterThan(20);
    expect(paprika.getHistorical).toHaveBeenCalledWith('btg-bitcoin-gold', String(Math.floor((nowMs - 23 * 3600_000) / 1000)), '1h', 'usd');
  });
});
