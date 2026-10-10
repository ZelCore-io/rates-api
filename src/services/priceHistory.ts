import { LRUCache as LRU } from 'lru-cache';
import * as log from '../lib/log';
import { CoinGecko } from './providers/coinGecko';

const DAY_S = 86400;
const HOUR_S = 3600;

/** Hourly data is served when the range ends within this window of now. */
const HOURLY_WINDOW_DAYS = 90;
/** CoinGecko only returns hourly points for range calls of at most 90 days. */
const MAX_HOURLY_CHUNK_DAYS = 90;
/** Upper bound on one request's span: 10 years, leap days included. */
const MAX_SPAN_S = 3653 * DAY_S;

const CLOSED_DAY_TTL_MS = 30 * DAY_S * 1000;
const OPEN_DAY_TTL_MS = HOUR_S * 1000;

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

export interface PriceHistory {
  prices: PricePoint[];
  granularity: Granularity;
}

/** A request the endpoint must answer with a non-200 status. */
export class PriceHistoryError extends Error {
  constructor(public readonly status: 400 | 404 | 502, message: string) {
    super(message);
    this.name = 'PriceHistoryError';
  }
}

interface CachedDay {
  granularity: Granularity;
  prices: PricePoint[];
}

/**
 * One entry per (geckoId, vs, UTC day). 200k entries is ~550 coin-years of
 * daily data or ~23 coin-years of hourly data (24 points each).
 */
const dayCache = new LRU<string, CachedDay>({ max: 200_000 });

const dayKey = (geckoId: string, vs: string, day: number): string => `${geckoId}|${vs}|${day}`;

/** Test hook: drop every cached day. */
export function clearPriceHistoryCache(): void {
  dayCache.clear();
}

/**
 * Validates and normalises the raw query values.
 *
 * @throws {PriceHistoryError} 400 on an invalid id, unsupported fiat,
 * non-integer timestamps, `from >= to`, or a span over 10 years.
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

function isNotFound(error: unknown): boolean {
  return (error as { response?: { status?: number } })?.response?.status === 404;
}

/**
 * Fetches one upstream range. Errors are logged by status/message only: the
 * Axios error object carries the request headers, which hold the Pro key.
 */
async function fetchRange(geckoId: string, vs: string, from: number, to: number): Promise<PricePoint[]> {
  try {
    const data = await CoinGecko.getInstance().getMarketChartRange(geckoId, vs, from, to);
    return (data?.prices ?? [])
      .filter((p): p is PricePoint => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]));
  } catch (error) {
    if (isNotFound(error)) throw new PriceHistoryError(404, 'Unknown coin');
    const status = (error as { response?: { status?: number } })?.response?.status;
    log.warn(`CoinGecko price history failed for ${geckoId}/${vs} ${from}-${to}: ${status ?? (error as Error)?.message}`);
    throw new PriceHistoryError(502, 'Price history temporarily unavailable');
  }
}

/**
 * Splits the missing days into contiguous runs, and hourly runs further into
 * chunks of at most 90 days. Each chunk covers whole UTC days, clamped to now.
 */
function planUpstreamCalls(missingDays: number[], granularity: Granularity, nowS: number): [number, number][] {
  const runs: [number, number][] = [];
  missingDays.forEach((day) => {
    const last = runs[runs.length - 1];
    if (last && last[1] === day - 1) last[1] = day;
    else runs.push([day, day]);
  });

  const calls: [number, number][] = [];
  runs.forEach(([firstDay, lastDay]) => {
    const chunkDays = granularity === 'hourly' ? MAX_HOURLY_CHUNK_DAYS : Infinity;
    for (let start = firstDay; start <= lastDay; start += chunkDays) {
      const end = Math.min(lastDay, start + chunkDays - 1);
      calls.push([start * DAY_S, Math.min((end + 1) * DAY_S - 1, nowS)]);
    }
  });
  return calls;
}

/**
 * Price history for one CoinGecko id in one fiat, shaped like CoinGecko's
 * `market_chart` (`[[epochMs, price], ...]`) plus the granularity served.
 *
 * Ranges ending within the last 90 days are hourly (upstream calls split
 * into ≤90-day chunks); older ranges are daily from a single upstream call.
 * Results are cached per (geckoId, vs, UTC day): closed days for 30 days,
 * today for 1 hour. A fully cached span makes no upstream call. Failures are
 * never cached.
 *
 * @param geckoId - Validated CoinGecko id.
 * @param vs - Validated, lowercase fiat code.
 * @param from - Range start, unix seconds (inclusive).
 * @param to - Range end, unix seconds (inclusive).
 * @throws {PriceHistoryError} 404 for an id CoinGecko doesn't know, 502 on
 * any other upstream failure.
 */
export async function getPriceHistory(geckoId: string, vs: string, from: number, to: number): Promise<PriceHistory> {
  const nowS = Math.floor(Date.now() / 1000);
  const end = Math.min(to, nowS);
  const granularity: Granularity = end >= nowS - HOURLY_WINDOW_DAYS * DAY_S ? 'hourly' : 'daily';
  if (from > end) return { prices: [], granularity };

  const firstDay = Math.floor(from / DAY_S);
  const lastDay = Math.floor(end / DAY_S);
  const today = Math.floor(nowS / DAY_S);

  // Assembled locally rather than re-read from the LRU, so an eviction
  // mid-request can never drop days from the response.
  const byDay = new Map<number, PricePoint[]>();
  const missing: number[] = [];
  for (let day = firstDay; day <= lastDay; day += 1) {
    const cached = dayCache.get(dayKey(geckoId, vs, day));
    if (cached?.granularity === granularity) byDay.set(day, cached.prices);
    else missing.push(day);
  }

  if (missing.length) {
    const calls = planUpstreamCalls(missing, granularity, nowS);
    const fetched: PricePoint[] = [];
    for (const [callFrom, callTo] of calls) {
      // eslint-disable-next-line no-await-in-loop -- deliberately sequential: chunks share the upstream rate limit.
      fetched.push(...await fetchRange(geckoId, vs, callFrom, callTo));
    }

    // Only reached when every call succeeded, so a partial failure caches nothing.
    // Days upstream had no data for (before listing) are cached empty too.
    const fresh = new Map<number, PricePoint[]>(missing.map((day) => [day, []]));
    downsample(fetched, granularity).forEach((point) => {
      fresh.get(Math.floor(point[0] / 1000 / DAY_S))?.push(point);
    });
    fresh.forEach((prices, day) => {
      byDay.set(day, prices);
      dayCache.set(dayKey(geckoId, vs, day), { granularity, prices }, {
        ttl: day < today ? CLOSED_DAY_TTL_MS : OPEN_DAY_TTL_MS,
      });
    });
  }

  const fromMs = from * 1000;
  const endMs = end * 1000;
  const prices: PricePoint[] = [];
  for (let day = firstDay; day <= lastDay; day += 1) {
    (byDay.get(day) ?? []).forEach((point) => {
      if (point[0] >= fromMs && point[0] <= endMs) prices.push(point);
    });
  }
  return { prices, granularity };
}
