import { LRUCache as LRU } from 'lru-cache';
import config from '../../config';
import * as log from '../lib/log';
import TokenBucket from '../lib/tokenBucket';
import UpstreamBudget from '../lib/upstreamBudget';
import { CoinGecko } from './providers/coinGecko';
import { CoinPaprika } from './providers/coinPaprika';
import { parseRetryAfterMs, SUPPORTED_FIATS } from './priceHistory';

/*
 * The CoinGecko v3 subset Blockbook's fiat downloader (`fiat/coingecko.go`)
 * calls, served under /v2/blockbook/api/v3 so explorers need no CoinGecko key:
 *
 * - simple/supported_vs_currencies
 * - simple/price?ids&vs_currencies
 * - coins/{id}/market_chart?vs_currency&days[&interval=daily]
 *
 * Blockbook reads only `prices` from market_chart, keeps daily points at
 * 00:00 UTC with a non-zero price, and retries only on 429 + Retry-After, so
 * every refusal here (spent budget, concurrency cap, upstream cooldown) is a
 * 429. Coins CoinGecko stopped tracking (`config.blockbookMirror.fallbacks`)
 * are priced from CoinPaprika's USD quote, converted through Bitcoin.
 */

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Daily series are refreshed this long after 00:00 UTC, once the new day's point is published. */
const DAILY_REFRESH_GRACE_MS = 20 * MINUTE_MS;
const SUPPORTED_VS_TTL_MS = DAY_MS;
const SIMPLE_PRICE_TTL_MS = MINUTE_MS;
const SHORT_CHART_TTL_MS = MINUTE_MS;
const LONG_CHART_TTL_MS = 10 * MINUTE_MS;
const TICKER_TTL_MS = 10 * MINUTE_MS;
const HOURLY_TTL_MS = 30 * MINUTE_MS;
/** CoinPaprika's free plan serves 1h points only for a start within ~24 h. */
const HOURLY_LOOKBACK_MS = 23 * HOUR_MS;
/** ... and 1d points up to a year back. */
const DAILY_LOOKBACK_DAYS = 364;

const MAX_DAILY_DAYS = 36500;
/** Without `interval`, only the two windows Blockbook asks for (5-minute and hourly refreshes). */
const INTRADAY_DAYS: readonly number[] = [1, 90];

const ID_RE = /^[a-z0-9-]{1,100}$/;
/** CoinGecko quote codes are short lowercase alphanumerics (usd, sats, link). */
const VS_RE = /^[a-z0-9]{1,20}$/;
const DAYS_RE = /^\d{1,5}$/;

/** Used until CoinGecko has answered supported_vs_currencies once. */
const STATIC_VS_CURRENCIES: readonly string[] = [...new Set([...SUPPORTED_FIATS, 'btc', 'eth', 'vef'])].sort();

export type PricePoint = [number, number];
export type SimplePrices = Record<string, Record<string, number>>;

/** A request the mirror must answer with a non-200 status (`retryAfterS` becomes `Retry-After`). */
export class MirrorError extends Error {
  constructor(public readonly status: 400 | 404 | 429 | 502, message: string, public readonly retryAfterS?: number) {
    super(message);
    this.name = 'MirrorError';
  }
}

const coinNotFound = (): MirrorError => new MirrorError(404, 'coin not found');

interface Entry<T> {
  value: T;
  expiresMs: number;
}

interface Provider {
  name: 'CoinGecko' | 'CoinPaprika';
  budget: UpstreamBudget;
}

interface Fallback {
  coinpaprikaId: string;
  sinceMs: number;
}

// Module state, rebuilt by resetBlockbookMirrorState(). As in priceHistory,
// expiry is checked against Date.now() by hand so it is testable; the LRUs
// only bound memory.
let coinGecko: Provider;
let coinPaprika: Provider;
let supportedVsCache: LRU<string, Entry<string[]>>;
let simplePriceCache: LRU<string, Entry<Record<string, number>>>;
let dailyCache: LRU<string, Entry<PricePoint[]>>;
let chartCache: LRU<string, Entry<PricePoint[]>>;
let tickerCache: LRU<string, Entry<number>>;
let paprikaSeriesCache: LRU<string, Entry<PricePoint[]>>;
let notFoundUntil: LRU<string, number>;
let lastGoodVs: string[] | null = null;
let vsRetryAfterMs = 0;
let fallbacks = new Map<string, Fallback>();
let servedIds = new Set<string>();
const inFlight = new Map<string, Promise<unknown>>();

/** Rebuilds caches, budgets, cooldowns and fallbacks from the current config. Also the test hook. */
export function resetBlockbookMirrorState(): void {
  const cfg = config.blockbookMirror;
  coinGecko = {
    name: 'CoinGecko',
    budget: new UpstreamBudget([
      new TokenBucket(cfg.coinGecko.burst, cfg.coinGecko.perMinute / MINUTE_MS),
      new TokenBucket(cfg.coinGecko.perDay, cfg.coinGecko.perDay / DAY_MS),
    ], cfg.maxConcurrentUpstream),
  };
  coinPaprika = {
    name: 'CoinPaprika',
    budget: new UpstreamBudget([new TokenBucket(cfg.coinPaprika.burst, cfg.coinPaprika.perDay / DAY_MS)], cfg.maxConcurrentUpstream),
  };
  supportedVsCache = new LRU({ max: 1 });
  simplePriceCache = new LRU({ max: 100 });
  dailyCache = new LRU({ maxSize: cfg.dailySeriesMaxPoints, sizeCalculation: (entry) => entry.value.length + 1 });
  chartCache = new LRU({ maxSize: cfg.chartCacheMaxPoints, sizeCalculation: (entry) => entry.value.length + 1 });
  tickerCache = new LRU({ max: 100 });
  paprikaSeriesCache = new LRU({ max: 200 });
  notFoundUntil = new LRU({ max: 10_000 });
  lastGoodVs = null;
  vsRetryAfterMs = 0;
  fallbacks = new Map(Object.entries(cfg.fallbacks).map(([id, fb]) => [id, { coinpaprikaId: fb.coinpaprikaId, sinceMs: Date.parse(`${fb.since}T00:00:00Z`) }]));
  servedIds = new Set(cfg.coins);
  inFlight.clear();
}
resetBlockbookMirrorState();

/** The first 00:20 UTC strictly after `nowMs`: when a cached daily series goes stale. */
function nextDailyRefreshMs(nowMs: number): number {
  const today = Math.floor(nowMs / DAY_MS) * DAY_MS + DAILY_REFRESH_GRACE_MS;
  return today > nowMs ? today : today + DAY_MS;
}

/** `[ts, price]` pairs with a finite timestamp and price; nulls and junk dropped. */
function cleanPoints(prices: unknown): PricePoint[] {
  if (!Array.isArray(prices)) return [];
  return prices.filter((p): p is PricePoint => Array.isArray(p) && Number.isFinite(p[0]) && typeof p[1] === 'number' && Number.isFinite(p[1]));
}

/**
 * Turns an upstream failure into a MirrorError. Logged by status/message
 * only: the Axios error object carries the request headers, which hold the
 * CoinGecko Pro key.
 */
function upstreamFailure(provider: Provider, what: string, error: unknown): MirrorError {
  const response = (error as { response?: { status?: number; headers?: Record<string, unknown> } })?.response;
  const cfg = config.blockbookMirror;
  if (response?.status === 404) return coinNotFound();
  if (response?.status === 429) {
    const waitMs = Math.min(parseRetryAfterMs(response.headers?.['retry-after']) ?? cfg.defaultCooldownMs, cfg.maxCooldownMs);
    provider.budget.coolDown(waitMs);
    log.warn(`Blockbook mirror: ${provider.name} rate-limited on ${what}; cooling down for ${Math.ceil(waitMs / 1000)}s`);
    return new MirrorError(429, 'Rate limited, retry later', Math.ceil(waitMs / 1000));
  }
  log.warn(`Blockbook mirror: ${provider.name} ${what} failed: ${response?.status ?? (error as Error)?.message}`);
  return new MirrorError(502, 'Upstream unavailable');
}

/**
 * Serves `key` from `cache` while fresh, otherwise makes one upstream call
 * through `provider`'s budget and caches the result until `expiresAt(now)`.
 *
 * - Concurrent callers for the same key share one call (coalescing).
 * - Failures are not cached; an upstream 404 is remembered for
 *   `notFoundCacheMs` so a dead id can't spend budget on every request.
 * - A refused admission is a 429 with the wait as `retryAfterS`.
 *
 * Synchronous up to the upstream await, so concurrent callers see each
 * other's in-flight calls and admissions.
 */
async function cached<T>(label: string, cache: LRU<string, Entry<T>>, key: string, expiresAt: (nowMs: number) => number, provider: Provider, fetch: () => Promise<T>): Promise<T> {
  const entry = cache.get(key);
  if (entry && entry.expiresMs > Date.now()) return entry.value;
  if (entry) cache.delete(key);
  const flightKey = `${label}|${key}`;
  if ((notFoundUntil.get(flightKey) ?? 0) > Date.now()) throw coinNotFound();
  const pending = inFlight.get(flightKey);
  if (pending) return pending as Promise<T>;

  const waitS = provider.budget.admit();
  if (waitS > 0) throw new MirrorError(429, 'Rate limited, retry later', waitS);
  const promise = (async () => {
    let value: T;
    try {
      value = await fetch();
    } catch (error) {
      const failure = error instanceof MirrorError ? error : upstreamFailure(provider, `${label} ${key}`, error);
      if (failure.status === 404) notFoundUntil.set(flightKey, Date.now() + config.blockbookMirror.notFoundCacheMs);
      throw failure;
    } finally {
      provider.budget.release();
    }
    cache.set(key, { value, expiresMs: expiresAt(Date.now()) });
    return value;
  })().finally(() => inFlight.delete(flightKey));
  inFlight.set(flightKey, promise);
  return promise;
}

/**
 * Quote currencies, as CoinGecko's `simple/supported_vs_currencies`.
 *
 * Cached 24 h. Never fails: when CoinGecko can't be asked or doesn't answer,
 * the last good list is served, or before the first answer a static list
 * (the price-history fiats plus btc, eth and vef); CoinGecko is then asked
 * again after `supportedVsRetryMs`.
 */
export async function getSupportedVsCurrencies(): Promise<string[]> {
  const fallback = lastGoodVs ?? [...STATIC_VS_CURRENCIES];
  const entry = supportedVsCache.get('all');
  if (!(entry && entry.expiresMs > Date.now()) && vsRetryAfterMs > Date.now()) return fallback;
  try {
    return await cached('vs', supportedVsCache, 'all', (now) => now + SUPPORTED_VS_TTL_MS, coinGecko, async () => {
      const raw = await CoinGecko.getInstance().getSupportedVsCurrencies();
      const list = Array.isArray(raw) ? [...new Set(raw.map((v) => String(v).toLowerCase()).filter((v) => VS_RE.test(v)))] : [];
      if (!list.length) throw new MirrorError(502, 'Upstream returned no currencies');
      lastGoodVs = list;
      return list;
    });
  } catch {
    vsRetryAfterMs = Date.now() + config.blockbookMirror.supportedVsRetryMs;
    return fallback;
  }
}

/**
 * A served CoinGecko id's current price in every supported quote currency
 * (plus usd): one CoinGecko `simple/price` call per id, cached 60 s. Every
 * request answers its subset from this, so varying `vs_currencies` costs no
 * extra upstream calls.
 */
async function geckoPrices(id: string): Promise<Record<string, number>> {
  const vs = [...new Set([...(await getSupportedVsCurrencies()), 'usd'])].sort();
  return cached('price', simplePriceCache, id, (now) => now + SIMPLE_PRICE_TTL_MS, coinGecko, async () => {
    const quotes = (await CoinGecko.getInstance().getSimplePrice([id], vs))?.[id];
    const out: Record<string, number> = {};
    if (quotes && typeof quotes === 'object') {
      vs.forEach((v) => {
        const price = quotes[v];
        if (typeof price === 'number' && Number.isFinite(price)) out[v] = price;
      });
    }
    return out;
  });
}

/**
 * Bitcoin's current price in every supported quote currency (the same
 * cached call as a bitcoin `simple/price`). Used as the cross:
 * `price(vs) = usd * bitcoin[vs] / bitcoin[usd]`.
 */
function bitcoinCross(): Promise<Record<string, number>> {
  return geckoPrices('bitcoin');
}

/**
 * USD → `vs` factor from a Bitcoin price map; undefined when Bitcoin has no
 * usable price in `vs`. For btc the numerator is exactly 1: CoinGecko's
 * bitcoin/btc quote drifts off 1 (seen at 1.000277).
 */
function crossRate(vs: string, bitcoin: Record<string, number>): number | undefined {
  if (vs === 'usd') return 1;
  const rate = (vs === 'btc' ? 1 : bitcoin[vs]) / bitcoin.usd;
  return Number.isFinite(rate) && rate > 0 ? rate : undefined;
}

/** CoinPaprika's current USD price, cached 10 min. */
function paprikaUsdPrice(coinpaprikaId: string): Promise<number> {
  return cached('ticker', tickerCache, coinpaprikaId, (now) => now + TICKER_TTL_MS, coinPaprika, async () => {
    const data = await CoinPaprika.getInstance().getTicker(coinpaprikaId);
    const price = data?.quotes?.USD?.price;
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) throw new MirrorError(502, 'Upstream returned no price');
    return price;
  });
}

/** CoinPaprika `historical` points as `[ms, usd]`, nulls dropped. */
async function paprikaSeries(coinpaprikaId: string, start: string, interval: '1d' | '1h'): Promise<PricePoint[]> {
  const data = await CoinPaprika.getInstance().getHistorical(coinpaprikaId, start, interval, 'usd');
  return cleanPoints((Array.isArray(data) ? data : []).map((p) => [Date.parse(p?.timestamp), p?.price]));
}

/**
 * CoinPaprika's daily USD series for a fallback coin from max(`since`, now −
 * 364 days), cached until the next 00:20 UTC.
 */
function paprikaDaily(fallback: Fallback): Promise<PricePoint[]> {
  return cached('paprika', paprikaSeriesCache, `${fallback.coinpaprikaId}|1d`, nextDailyRefreshMs, coinPaprika, () => {
    const startMs = Math.max(fallback.sinceMs, (Math.floor(Date.now() / DAY_MS) - DAILY_LOOKBACK_DAYS) * DAY_MS);
    return paprikaSeries(fallback.coinpaprikaId, new Date(startMs).toISOString().slice(0, 10), '1d');
  });
}

/** CoinPaprika's hourly USD series for the last 23 hours, cached 30 min. */
function paprikaHourly(fallback: Fallback): Promise<PricePoint[]> {
  return cached('paprika', paprikaSeriesCache, `${fallback.coinpaprikaId}|1h`, (now) => now + HOURLY_TTL_MS, coinPaprika, () => {
    const startS = Math.floor((Date.now() - HOURLY_LOOKBACK_MS) / 1000);
    return paprikaSeries(fallback.coinpaprikaId, String(startS), '1h');
  });
}

/**
 * CoinGecko's full daily series for (id, vs) (`market_chart?days=max&interval=daily`),
 * cached until the next 00:20 UTC. Blockbook asks once a day after 01:00 UTC,
 * so each pair costs one upstream call a day.
 */
function geckoDaily(id: string, vs: string): Promise<PricePoint[]> {
  return cached('daily', dailyCache, `${id}|${vs}`, nextDailyRefreshMs, coinGecko, async () => cleanPoints((await CoinGecko.getInstance().getMarketChart(id, vs, 'max', 'daily'))?.prices));
}

/** Points at exactly 00:00 UTC, by UTC day number. */
function byMidnight(points: PricePoint[]): Map<number, number> {
  const out = new Map<number, number>();
  points.forEach(([ts, price]) => {
    if (ts % DAY_MS === 0 && price > 0) out.set(ts / DAY_MS, price);
  });
  return out;
}

/**
 * Daily series for a fallback coin from `fromMs` on (null: all of it):
 * CoinGecko's (frozen) history before `since`, then CoinPaprika's daily USD
 * points converted with Bitcoin's daily price in `vs` and in USD for the
 * same day. Days without both Bitcoin points are skipped. CoinGecko's
 * history is only fetched when the window starts before `since`.
 */
async function fallbackDaily(id: string, fallback: Fallback, vs: string, fromMs: number | null): Promise<PricePoint[]> {
  let history: PricePoint[] = [];
  if (fromMs === null || fromMs < fallback.sinceMs) {
    try {
      history = (await geckoDaily(id, vs)).filter(([ts]) => ts < fallback.sinceMs);
    } catch (error) {
      if (!(error instanceof MirrorError && error.status === 404)) throw error;
    }
  }
  const usd = (await paprikaDaily(fallback)).filter(([ts]) => ts >= fallback.sinceMs);
  if (vs === 'usd') return [...history, ...usd];

  // Sequential on purpose: a parallel pair would take two of the four
  // concurrency slots that other requests are refused against.
  const bitcoinUsd = byMidnight(await geckoDaily('bitcoin', 'usd'));
  const bitcoinVs = vs === 'btc' ? null : byMidnight(await geckoDaily('bitcoin', vs));
  const converted: PricePoint[] = [];
  usd.forEach(([ts, price]) => {
    const day = Math.floor(ts / DAY_MS);
    const btcUsd = bitcoinUsd.get(day);
    const btcVs = bitcoinVs ? bitcoinVs.get(day) : 1;
    if (btcUsd && btcVs) converted.push([ts, (price * btcVs) / btcUsd]);
  });
  return [...history, ...converted];
}

/** Only the configured explorer coins (`blockbookMirror.coins`); anything else is a 404 before any upstream call. */
function assertServedId(id: string): void {
  if (!ID_RE.test(id) || !servedIds.has(id)) throw coinNotFound();
}

async function assertSupportedVs(vs: string[]): Promise<void> {
  const supported = new Set(await getSupportedVsCurrencies());
  const unsupported = vs.find((v) => !supported.has(v));
  if (unsupported) throw new MirrorError(400, `Unsupported vs currency: ${unsupported}`);
}

/** A comma-separated query value as a deduplicated, lowercase list; undefined when malformed. */
function parseList(raw: unknown, re: RegExp): string[] | undefined {
  if (typeof raw !== 'string' || !raw.length) return undefined;
  const items = raw.split(',').map((item) => item.trim().toLowerCase());
  if (items.some((item) => !re.test(item))) return undefined;
  return [...new Set(items)];
}

/**
 * Validates `simple/price` query values: at most `maxIds` ids and
 * `maxVsCurrencies` quote currencies, each well-formed.
 *
 * @throws {MirrorError} 400 on a missing, repeated or malformed parameter or too many values.
 */
export function parseSimplePriceParams(ids: unknown, vsCurrencies: unknown): { ids: string[]; vs: string[] } {
  const cfg = config.blockbookMirror;
  const idList = parseList(ids, ID_RE);
  if (!idList) throw new MirrorError(400, 'ids must be a comma-separated list of coin ids');
  if (idList.length > cfg.maxIds) throw new MirrorError(400, `At most ${cfg.maxIds} ids`);
  const vsList = parseList(vsCurrencies, VS_RE);
  if (!vsList) throw new MirrorError(400, 'vs_currencies must be a comma-separated list of currency codes');
  if (vsList.length > cfg.maxVsCurrencies) throw new MirrorError(400, `At most ${cfg.maxVsCurrencies} vs_currencies`);
  return { ids: idList, vs: vsList };
}

/**
 * Current prices, as CoinGecko's `simple/price`: `{id: {vs: price}}`.
 *
 * - Every id must be a configured explorer coin (else 404) and every vs a
 *   supported quote currency (else 400).
 * - CoinGecko ids: one upstream call per id for every supported quote
 *   currency, cached 60 s; the requested currencies are picked from it.
 * - Fallback ids: CoinPaprika's USD price (cached 10 min) times Bitcoin's
 *   current `vs`/`usd` ratio from CoinGecko (cached 60 s).
 *
 * @param ids - Validated ids from `parseSimplePriceParams`.
 * @param vs - Validated quote currencies from `parseSimplePriceParams`.
 * @throws {MirrorError} 400, 404, 429 (budget, concurrency cap or cooldown;
 * carries `retryAfterS`) or 502.
 */
export async function getSimplePrice(ids: string[], vs: string[]): Promise<SimplePrices> {
  ids.forEach(assertServedId);
  await assertSupportedVs(vs);
  const sortedVs = [...vs].sort();
  const out: SimplePrices = {};
  const pick = (prices: Record<string, number>): Record<string, number> => Object.fromEntries(sortedVs.filter((v) => v in prices).map((v) => [v, prices[v]]));
  // eslint-disable-next-line no-restricted-syntax -- sequential on purpose, see fallbackDaily.
  for (const id of ids.filter((i) => !fallbacks.has(i)).sort()) {
    // eslint-disable-next-line no-await-in-loop
    out[id] = pick(await geckoPrices(id));
  }

  const fallbackIds = ids.filter((id) => fallbacks.has(id));
  if (fallbackIds.length) {
    const cross = vs.some((v) => v !== 'usd') ? await bitcoinCross() : {};
    // eslint-disable-next-line no-restricted-syntax -- sequential on purpose, see fallbackDaily.
    for (const id of fallbackIds) {
      // eslint-disable-next-line no-await-in-loop
      const usd = await paprikaUsdPrice(fallbacks.get(id)!.coinpaprikaId);
      out[id] = {};
      sortedVs.forEach((v) => {
        const rate = crossRate(v, cross);
        if (rate !== undefined) out[id][v] = usd * rate;
      });
    }
  }
  return out;
}

export interface MarketChartParams {
  id: string;
  vs: string;
  /** Days back from now; `max` only with `interval: 'daily'`. */
  days: number | 'max';
  interval?: 'daily';
}

/**
 * Validates `coins/{id}/market_chart` values: `interval` absent or `daily`;
 * `days` an integer 1..36500 or `max` with `daily`, 1 or 90 without.
 *
 * @throws {MirrorError} 400 on a missing, repeated or malformed parameter;
 * 404 for a malformed id.
 */
export function parseMarketChartParams(id: unknown, vsCurrency: unknown, days: unknown, interval: unknown): MarketChartParams {
  const coin = typeof id === 'string' ? id : '';
  if (!ID_RE.test(coin)) throw coinNotFound();
  const vs = typeof vsCurrency === 'string' ? vsCurrency.toLowerCase() : '';
  if (!VS_RE.test(vs)) throw new MirrorError(400, 'vs_currency must be a currency code');
  if (interval !== undefined && interval !== 'daily') throw new MirrorError(400, 'interval must be daily or absent');
  const daily = interval === 'daily';
  if (daily && days === 'max') {
    return {
      id: coin, vs, days: 'max', interval: 'daily',
    };
  }
  const n = typeof days === 'string' && DAYS_RE.test(days) ? Number(days) : NaN;
  if (!daily) {
    if (!INTRADAY_DAYS.includes(n)) throw new MirrorError(400, 'days must be 1 or 90 without interval');
    return { id: coin, vs, days: n };
  }
  if (!(n >= 1 && n <= MAX_DAILY_DAYS)) throw new MirrorError(400, `days must be an integer 1..${MAX_DAILY_DAYS} or max`);
  return {
    id: coin, vs, days: n, interval: 'daily',
  };
}

/**
 * Price chart, as CoinGecko's `coins/{id}/market_chart`, `prices` only:
 * `{prices: [[epochMs, price], ...]}`, null prices dropped.
 *
 * - `interval: 'daily'`: sliced from one cached full daily series per
 *   (id, vs), fresh until the next 00:20 UTC; points with ts >= now − days
 *   (all for `max`). Fallback coins stitch CoinGecko's history before
 *   `since` (asked only when the window reaches before `since`) to
 *   CoinPaprika's converted daily points.
 * - No interval: passed through to CoinGecko (`days` 1 or 90), cached 60 s
 *   for days 1, 10 min for 90. Fallback coins get CoinPaprika's hourly
 *   points for the last 23 hours (cached 30 min) at the current Bitcoin
 *   cross, whatever `days` asks for.
 *
 * Cache keys are built only from validated, bounded values: a configured
 * coin, a supported vs currency and (intraday) days 1 or 90.
 *
 * @throws {MirrorError} 400 (unsupported vs), 404 (unserved id or upstream
 * 404), 429 (carries `retryAfterS`) or 502.
 */
export async function getMarketChart(params: MarketChartParams): Promise<{ prices: PricePoint[] }> {
  const {
    id, vs, days, interval,
  } = params;
  assertServedId(id);
  await assertSupportedVs([vs]);
  const fallback = fallbacks.get(id);

  if (interval === 'daily') {
    const fromMs = days === 'max' ? null : Date.now() - days * DAY_MS;
    const series = fallback ? await fallbackDaily(id, fallback, vs, fromMs) : await geckoDaily(id, vs);
    return { prices: fromMs === null ? series : series.filter(([ts]) => ts >= fromMs) };
  }

  if (fallback) {
    const usd = await paprikaHourly(fallback);
    if (vs === 'usd') return { prices: usd };
    const rate = crossRate(vs, await bitcoinCross());
    return { prices: rate === undefined ? [] : usd.map(([ts, price]): PricePoint => [ts, price * rate]) };
  }

  const n = days as number;
  const ttlMs = n <= 1 ? SHORT_CHART_TTL_MS : LONG_CHART_TTL_MS;
  const prices = await cached('chart', chartCache, `${id}|${vs}|${n}`, (now) => now + ttlMs, coinGecko, async () => cleanPoints((await CoinGecko.getInstance().getMarketChart(id, vs, n))?.prices));
  return { prices };
}
