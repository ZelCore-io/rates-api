import { LRUCache as LRU } from 'lru-cache';
import config from '../../config';
import * as log from '../lib/log';
import TokenBucket from '../lib/tokenBucket';
import { CoinGecko } from './providers/coinGecko';
import { coinAggregatorIDs } from './coinAggregatorIDs';

const DAY_S = 86400;
const HOUR_S = 3600;

/** The last 90 UTC days (today included) are hourly; everything older is daily. */
const HOURLY_DAYS = 90;
/** Upper bound on one request's span: 10 years, leap days included. */
const MAX_SPAN_S = 3653 * DAY_S;
/** CoinGecko's price history starts here (bitcoin, 2013-04-28); earlier starts are clamped. */
const EARLIEST_S = Date.UTC(2013, 3, 28) / 1000;

const CLOSED_DAY_TTL_MS = 30 * DAY_S * 1000;
const OPEN_DAY_TTL_MS = HOUR_S * 1000;
/** A day counts as closed (long TTL) only this long after its UTC end, so late-published points get picked up. */
const CLOSE_GRACE_MS = 2 * HOUR_S * 1000;

const GECKO_ID_RE = /^[a-z0-9-]{1,100}$/;
const UNIX_SECONDS_RE = /^\d{1,12}$/;

/**
 * Fiat currencies CoinGecko accepts as `vs_currency`. Crypto quote
 * currencies (btc, eth, ...) are deliberately left out: this endpoint exists
 * for fiat-denominated tax reports.
 */
export const SUPPORTED_FIATS: ReadonlySet<string> = new Set([
  'usd', 'aed', 'ars', 'aud', 'bdt', 'bhd', 'bmd', 'brl', 'cad', 'chf', 'clp', 'cny', 'czk', 'dkk', 'eur', 'gbp',
  'gel', 'hkd', 'huf', 'idr', 'ils', 'inr', 'jpy', 'krw', 'kwd', 'lkr', 'mmk', 'mxn', 'myr', 'ngn', 'nok', 'nzd',
  'php', 'pkr', 'pln', 'rub', 'sar', 'sek', 'sgd', 'thb', 'try', 'twd', 'uah', 'vnd', 'zar',
]);

export type Granularity = 'daily' | 'hourly';
type PricePoint = [number, number];

/** A contiguous part of the response at one granularity; `from`/`to` are epoch ms, inclusive. */
export interface PriceSegment {
  granularity: Granularity;
  from: number;
  to: number;
}

export interface PriceHistory {
  prices: PricePoint[];
  /** `mixed` when the range spans both a daily (older) and an hourly (last 90 days) segment. */
  granularity: Granularity | 'mixed';
  segments: PriceSegment[];
}

/** A request the endpoint must answer with a non-200 status. */
export class PriceHistoryError extends Error {
  constructor(public readonly status: 400 | 404 | 502 | 503, message: string, public readonly retryAfterS?: number) {
    super(message);
    this.name = 'PriceHistoryError';
  }
}

interface CachedDay {
  granularity: Granularity;
  prices: PricePoint[];
  expiresMs: number;
}

// Module state, rebuilt by resetPriceHistoryState(). Expiry is checked
// against Date.now() by hand (not lru-cache's TTL clock) so it is testable;
// the LRU only bounds memory.
let dayCache: LRU<string, CachedDay>;
let notFoundUntil: LRU<string, number>;
let minuteBucket: TokenBucket;
let dayBucket: TokenBucket;
let activeUpstream = 0;
let cooldownUntilMs = 0;
const inFlight = new Map<string, Promise<Map<number, PricePoint[]>>>();
let allowList: { source: string[]; length: number; ids: Set<string> } | null = null;

/** Rebuilds caches, budgets and cooldown from the current config. Also the test hook. */
export function resetPriceHistoryState(): void {
  const cfg = config.priceHistory;
  dayCache = new LRU<string, CachedDay>({
    max: cfg.cacheMaxEntries,
    maxSize: cfg.cacheMaxSize,
    sizeCalculation: (day) => day.prices.length + 1,
  });
  notFoundUntil = new LRU<string, number>({ max: 10_000 });
  minuteBucket = new TokenBucket(cfg.upstreamBurst, cfg.upstreamPerMinute / 60_000);
  dayBucket = new TokenBucket(cfg.upstreamPerDay, cfg.upstreamPerDay / (DAY_S * 1000));
  activeUpstream = 0;
  cooldownUntilMs = 0;
  inFlight.clear();
  allowList = null;
}
resetPriceHistoryState();

const dayKey = (geckoId: string, vs: string, day: number): string => `${geckoId}|${vs}|${day}`;

function getDay(key: string): CachedDay | undefined {
  const day = dayCache.get(key);
  if (day && day.expiresMs <= Date.now()) {
    dayCache.delete(key);
    return undefined;
  }
  return day;
}

/**
 * Only CoinGecko ids ZelCore carries are served: the static list plus every
 * `coingeckoID` from coininfo.json, merged hourly by `getLatestCoinInfo`.
 * This keeps the endpoint from being an open proxy over all of CoinGecko.
 * Shared with the Blockbook mirror (`services/blockbookMirror`).
 */
export function isSupportedId(geckoId: string): boolean {
  const source = coinAggregatorIDs.coingecko;
  if (!allowList || allowList.source !== source || allowList.length !== source.length) {
    allowList = { source, length: source.length, ids: new Set(source) };
  }
  return allowList.ids.has(geckoId);
}

/**
 * Validates and normalises the raw query values.
 *
 * @throws {PriceHistoryError} 400 on an invalid id, unsupported fiat,
 * non-integer timestamps, `from >= to`, a start in the future, or a span
 * over 10 years.
 */
export function parsePriceHistoryParams(geckoId: unknown, vs: unknown, from: unknown, to: unknown): { geckoId: string; vs: string; from: number; to: number } {
  const id = String(geckoId ?? '');
  if (!GECKO_ID_RE.test(id)) throw new PriceHistoryError(400, 'Invalid geckoId');
  const fiat = String(vs ?? '').toLowerCase();
  if (!SUPPORTED_FIATS.has(fiat)) throw new PriceHistoryError(400, 'Unsupported vs currency');
  const fromStr = String(from ?? '');
  const toStr = String(to ?? '');
  if (!UNIX_SECONDS_RE.test(fromStr) || !UNIX_SECONDS_RE.test(toStr)) {
    throw new PriceHistoryError(400, 'from and to must be unix timestamps in seconds');
  }
  const fromS = Number(fromStr);
  const toS = Number(toStr);
  if (fromS >= toS) throw new PriceHistoryError(400, 'from must be before to');
  if (fromS > Date.now() / 1000) throw new PriceHistoryError(400, 'from must not be in the future');
  if (toS - fromS > MAX_SPAN_S) throw new PriceHistoryError(400, 'Range must not exceed 10 years');
  return {
    geckoId: id, vs: fiat, from: fromS, to: toS,
  };
}

/**
 * Keeps the first point per UTC day (daily) or per UTC hour (hourly).
 * CoinGecko picks its own granularity from the call's span (5-minutely for a
 * 1-day call ending now, hourly up to 90 days, daily beyond), so a short
 * gap-filling call would otherwise mix resolutions into the cache.
 */
function downsample(prices: PricePoint[], granularity: Granularity): PricePoint[] {
  const bucketMs = (granularity === 'daily' ? DAY_S : HOUR_S) * 1000;
  const seen = new Set<number>();
  const out: PricePoint[] = [];
  [...prices].sort((a, b) => a[0] - b[0]).forEach((point) => {
    const bucket = Math.floor(point[0] / bucketMs);
    if (seen.has(bucket)) return;
    seen.add(bucket);
    out.push(point);
  });
  return out;
}

/** `Retry-After` as seconds or an HTTP date; undefined when absent or unusable. */
export function parseRetryAfterMs(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return seconds > 0 ? seconds * 1000 : undefined;
  const at = Date.parse(String(value));
  return Number.isFinite(at) && at > Date.now() ? at - Date.now() : undefined;
}

/**
 * One upstream call. Errors are logged by status/message only: the Axios
 * error object carries the request headers, which hold the Pro key.
 */
async function fetchRange(geckoId: string, vs: string, from: number, to: number): Promise<PricePoint[]> {
  try {
    const data = await CoinGecko.getInstance().getMarketChartRange(geckoId, vs, from, to);
    return (data?.prices ?? [])
      .filter((p): p is PricePoint => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]));
  } catch (error) {
    const response = (error as { response?: { status?: number; headers?: Record<string, unknown> } })?.response;
    const cfg = config.priceHistory;
    if (response?.status === 404) {
      notFoundUntil.set(geckoId, Date.now() + cfg.notFoundCacheMs);
      throw new PriceHistoryError(404, 'Unknown coin');
    }
    if (response?.status === 429) {
      const waitMs = Math.min(parseRetryAfterMs(response.headers?.['retry-after']) ?? cfg.defaultCooldownMs, cfg.maxCooldownMs);
      cooldownUntilMs = Math.max(cooldownUntilMs, Date.now() + waitMs);
      log.warn(`CoinGecko price history rate-limited; cooling down for ${Math.ceil(waitMs / 1000)}s`);
      throw new PriceHistoryError(503, 'Price history temporarily unavailable', Math.ceil(waitMs / 1000));
    }
    log.warn(`CoinGecko price history failed for ${geckoId}/${vs} ${from}-${to}: ${response?.status ?? (error as Error)?.message}`);
    throw new PriceHistoryError(502, 'Price history temporarily unavailable');
  }
}

/**
 * Fetches whole UTC days `startDay..endDay` in one upstream call and caches
 * every day in that span, empty ones included (briefly), so a bad or
 * pre-listing range isn't re-fetched on every request. Failures cache
 * nothing.
 */
async function fillSpan(geckoId: string, vs: string, granularity: Granularity, startDay: number, endDay: number): Promise<Map<number, PricePoint[]>> {
  activeUpstream += 1;
  let points: PricePoint[];
  try {
    const callTo = Math.min((endDay + 1) * DAY_S - 1, Math.floor(Date.now() / 1000));
    points = await fetchRange(geckoId, vs, startDay * DAY_S, callTo);
  } finally {
    activeUpstream -= 1;
  }

  const fresh = new Map<number, PricePoint[]>();
  for (let day = startDay; day <= endDay; day += 1) fresh.set(day, []);
  downsample(points, granularity).forEach((point) => {
    fresh.get(Math.floor(point[0] / 1000 / DAY_S))?.push(point);
  });

  const now = Date.now();
  fresh.forEach((prices, day) => {
    const closed = (day + 1) * DAY_S * 1000 + CLOSE_GRACE_MS <= now;
    let ttl = closed ? CLOSED_DAY_TTL_MS : OPEN_DAY_TTL_MS;
    if (!prices.length) ttl = Math.min(ttl, config.priceHistory.emptyDayCacheMs);
    dayCache.set(dayKey(geckoId, vs, day), { granularity, prices, expiresMs: now + ttl });
  });
  return fresh;
}

/**
 * Admits new upstream calls against the cooldown, the concurrency cap and
 * both token buckets, all-or-nothing; refuses with 503 + Retry-After rather
 * than queueing.
 */
function admit(calls: number): void {
  const cfg = config.priceHistory;
  const cooldownMs = cooldownUntilMs - Date.now();
  if (cooldownMs > 0) {
    throw new PriceHistoryError(503, 'Price history temporarily unavailable', Math.ceil(cooldownMs / 1000));
  }
  if (activeUpstream + calls > cfg.maxConcurrentUpstream) {
    throw new PriceHistoryError(503, 'Price history busy', 1);
  }
  const waitMs = Math.max(minuteBucket.waitMs(calls), dayBucket.waitMs(calls));
  if (waitMs > 0) {
    throw new PriceHistoryError(503, 'Price history busy', Math.max(1, Math.ceil(waitMs / 1000)));
  }
  minuteBucket.take(calls);
  dayBucket.take(calls);
}

/**
 * Price history for one CoinGecko id in one fiat, as `[[epochMs, price], ...]`.
 *
 * - Days in the last 90 UTC days are hourly, older days daily; a range
 *   crossing that line comes back `mixed` with one segment of each.
 * - Cached per (geckoId, vs, UTC day): closed days (ended 2+ hours ago)
 *   30 days, today and just-closed days 1 hour, empty days 1 hour. A fully cached span makes no upstream call.
 * - Cache misses cost at most two upstream calls (one daily span, one
 *   hourly span); concurrent requests for the same span share one call.
 * - Upstream calls are admitted by a per-minute and a per-day budget, a
 *   concurrency cap and a 429 cooldown (503 + Retry-After when refused).
 *
 * The id must be one ZelCore carries; anything else is a 404 before any
 * upstream call, as is an id CoinGecko recently answered 404 for.
 *
 * Synchronous up to the upstream await, so concurrent callers see each
 * other's in-flight spans.
 *
 * @param geckoId - Validated CoinGecko id.
 * @param vs - Validated, lowercase fiat code.
 * @param from - Range start, unix seconds (inclusive); clamped to 2013-04-28.
 * @param to - Range end, unix seconds (inclusive); clamped to now.
 * @throws {PriceHistoryError} 404 (unknown id), 502 (upstream failure) or
 * 503 (budget, concurrency cap or cooldown; carries `retryAfterS`).
 */
export async function getPriceHistory(geckoId: string, vs: string, from: number, to: number): Promise<PriceHistory> {
  if (!isSupportedId(geckoId)) throw new PriceHistoryError(404, 'Unknown coin');
  if ((notFoundUntil.get(geckoId) ?? 0) > Date.now()) throw new PriceHistoryError(404, 'Unknown coin');

  const nowS = Math.floor(Date.now() / 1000);
  const start = Math.max(from, EARLIEST_S);
  const end = Math.min(to, nowS);
  if (start > end) return { prices: [], granularity: 'daily', segments: [] };

  const today = Math.floor(nowS / DAY_S);
  const hourlyStartDay = today - (HOURLY_DAYS - 1);
  const firstDay = Math.floor(start / DAY_S);
  const lastDay = Math.floor(end / DAY_S);

  // Assembled locally rather than re-read from the LRU, so an eviction
  // mid-request can never drop days from the response.
  const byDay = new Map<number, PricePoint[]>();
  const missing: Record<Granularity, number[]> = { daily: [], hourly: [] };
  for (let day = firstDay; day <= lastDay; day += 1) {
    const wanted: Granularity = day >= hourlyStartDay ? 'hourly' : 'daily';
    const cached = getDay(dayKey(geckoId, vs, day));
    if (cached?.granularity === wanted) byDay.set(day, cached.prices);
    else if (cached && wanted === 'daily') byDay.set(day, downsample(cached.prices, 'daily'));
    else missing[wanted].push(day);
  }

  // One span per granularity, from its first to its last missing day: cached
  // days inside the span are re-fetched for free rather than costing a call.
  const spans = (['daily', 'hourly'] as Granularity[])
    .filter((g) => missing[g].length)
    .map((g) => ({
      granularity: g,
      startDay: missing[g][0],
      endDay: missing[g][missing[g].length - 1],
      key: `${geckoId}|${vs}|${g}|${missing[g][0]}|${missing[g][missing[g].length - 1]}`,
    }));
  const newSpans = spans.filter((span) => !inFlight.has(span.key));
  if (newSpans.length) admit(newSpans.length);
  newSpans.forEach((span) => {
    const promise = fillSpan(geckoId, vs, span.granularity, span.startDay, span.endDay)
      .finally(() => inFlight.delete(span.key));
    inFlight.set(span.key, promise);
  });

  const filled = await Promise.all(spans.map((span) => inFlight.get(span.key)!));
  filled.forEach((fresh) => fresh.forEach((prices, day) => {
    if (day >= firstDay && day <= lastDay) byDay.set(day, prices);
  }));

  const startMs = start * 1000;
  const endMs = end * 1000;
  const prices: PricePoint[] = [];
  for (let day = firstDay; day <= lastDay; day += 1) {
    (byDay.get(day) ?? []).forEach((point) => {
      if (point[0] >= startMs && point[0] <= endMs) prices.push(point);
    });
  }

  const hourlyStartMs = hourlyStartDay * DAY_S * 1000;
  const segments: PriceSegment[] = [];
  if (startMs < hourlyStartMs) segments.push({ granularity: 'daily', from: startMs, to: Math.min(endMs, hourlyStartMs - 1) });
  if (endMs >= hourlyStartMs) segments.push({ granularity: 'hourly', from: Math.max(startMs, hourlyStartMs), to: endMs });
  return { prices, granularity: segments.length > 1 ? 'mixed' : segments[0].granularity, segments };
}
