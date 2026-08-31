import { LRUCache as LRU } from 'lru-cache';
import config from '../../../config';
import * as log from '../../lib/log';
import { AxiosWrapper } from '../../lib/axios';
import { arraySplit } from '../../lib/utils';
import type { BinanceTicker, BinanceTokenisedAsset } from '../../types';

// 7d ticker window is fetched per-symbol; stay far under Binance's 200-weight/request cap.
const TICKER_CHUNK = 20;

// Quote cache TTL, and with it the bound on how old a served price may be and
// still count as live: a batch answered from `quoteCache` legitimately carries
// a price up to one TTL old. See `pricedFresh`.
const QUOTE_CACHE_MS = 60 * 1000;

// Kline (history) cache TTL. History barely moves between refreshes — only the
// in-progress candle changes — and the wallet caches chart data locally for an
// hour anyway, so 10 minutes keeps charts current without re-spending Binance
// request weight on every chart open.
const KLINE_CACHE_MS = 10 * 60 * 1000;

/**
 * Singleton class to interact with Binance's public (no-API-key) endpoints.
 *
 * Provides the tokenised-asset universe (bStocks with a BSC contract) and Spot
 * 24h/7d tickers, quoted in USDT. Mirrors `CoinGecko`'s shape: an `AxiosWrapper`
 * per base URL, an `LRUCache` per refresh cadence, and defensive error handling
 * that never lets a single failed refresh drop a symbol that was previously
 * known good (e.g. during a CEX trading halt around a stock split).
 *
 * @example
 * ```typescript
 * import { Binance } from './binance';
 *
 * async function fetchBStocks() {
 *   const binance = Binance.getInstance();
 *   const assets = await binance.getTokenisedAssets();
 *   const trading = await binance.getTradingSymbols();
 *   const tickers = await binance.getTicker24h([...trading]);
 *   console.log(tickers);
 * }
 * ```
 */
export class Binance {
  /**
   * The singleton instance of the Binance class.
   * @private
   */
  private static instance: Binance;

  /**
   * AxiosWrapper for the api.binance.com host (exchangeInfo, tickers).
   * @private
   */
  private api = new AxiosWrapper(config.binanceApiUrl);

  /**
   * AxiosWrapper for the www.binance.com host (tokenised-asset listing).
   * @private
   */
  private assetApi = new AxiosWrapper(config.binanceAssetUrl);

  /**
   * Cache for slow-moving data (tokenised-asset list, trading symbol set): 1 hour.
   * @private
   */
  private longCache = new LRU<string, any>({ max: 10, ttl: 60 * 60 * 1000 });

  /**
   * Cache for ticker quotes, keyed by requested symbol set: 60 seconds.
   * @private
   */
  private quoteCache = new LRU<string, any>({ max: 50, ttl: QUOTE_CACHE_MS });

  /**
   * Cache for kline (candlestick) history, keyed by symbol/interval/limit: 10
   * minutes. Sized for the bStock universe (~20 symbols) times the handful of
   * chart ranges the wallet requests.
   * @private
   */
  private klineCache = new LRU<string, any>({ max: 200, ttl: KLINE_CACHE_MS });

  /**
   * Last-known-good ticker per `${window}:${symbol}`, independent of
   * `quoteCache`'s TTL, with the epoch-ms timestamp at which it was accepted.
   * Used to backfill a symbol whose fresh value is unusable — a halted symbol
   * priced at zero, a symbol omitted from the batch, or an entire request
   * that failed — so a transient gap upstream never drops the symbol or
   * fabricates a price for it.
   *
   * Keyed per window (not bare symbol) because `getTicker24h` and
   * `getTicker7d` both resolve the same symbol but with window-scoped
   * `priceChangePercent`/`quoteVolume`. A single symbol-keyed store would let
   * whichever window last wrote silently overwrite the other's fallback —
   * e.g. a 7d fetch populating the store, then a later 24h failure serving
   * the 7-day change/volume as the 24-hour figure.
   * @private
   */
  private lastGoodTicker = new Map<string, { ticker: BinanceTicker; at: number }>();

  /**
   * Whether a freshly-fetched ticker carries a usable price.
   *
   * Binance does NOT omit a halted symbol from the ticker response: it returns
   * the symbol present with `lastPrice: "0.00000000"`. Measured against live
   * data, 20 of 20 requested BREAK-status symbols came back present and 9 of
   * those 20 were priced at zero. So a presence check alone never triggers the
   * last-known-good fallback, and accepting the zero would both serve $0 and
   * overwrite the good value — worse than dropping the entry.
   *
   * @private
   * @param ticker - A ticker straight from Binance.
   * @returns True when the ticker has a finite, strictly positive last price.
   */
  private static isUsable(ticker: BinanceTicker | undefined): ticker is BinanceTicker {
    if (!ticker) return false;
    const px = parseFloat(String(ticker.lastPrice));
    return Number.isFinite(px) && px > 0;
  }

  /**
   * Returns the singleton instance of the Binance class.
   *
   * @returns The singleton instance of Binance.
   */
  static getInstance(): Binance {
    if (!Binance.instance) Binance.instance = new Binance();
    return Binance.instance;
  }

  /**
   * Filters tokenised assets down to those with a BSC (BNB Smart Chain) contract listed.
   *
   * @param assets - The raw tokenised-asset list from Binance.
   * @returns Only the assets with at least one BSC entry in `caList`.
   */
  // eslint-disable-next-line class-methods-use-this -- pure helper, but part of the provider's instance API like the rest of the class.
  filterBscAssets(assets: BinanceTokenisedAsset[]): BinanceTokenisedAsset[] {
    return (assets || []).filter((a) => (a.caList || [])
      .some((c) => String(c.network).toUpperCase() === 'BSC' && !!c.ca));
  }

  /**
   * Splits a symbol list into chunks of at most `TICKER_CHUNK` symbols, to stay
   * under Binance's per-request weight cap on the 7d rolling-window ticker.
   *
   * @param symbols - The full symbol list to split.
   * @returns An array of symbol chunks.
   */
  // eslint-disable-next-line class-methods-use-this -- pure helper, but part of the provider's instance API like the rest of the class.
  chunkSymbols(symbols: string[]): string[][] {
    return arraySplit(symbols, TICKER_CHUNK);
  }

  /**
   * Merges a freshly-fetched ticker batch into the last-known-good store, then
   * returns the requested symbols using the fresh value where available and
   * falling back to the last-known-good value otherwise (halted/omitted symbol,
   * or the whole request failed and `fetched` is empty).
   *
   * `window` scopes both the write and the fallback read to `${window}:${symbol}`
   * so the 24h and 7d stores never collide — see the `lastGoodTicker` doc.
   *
   * @private
   * @param window - Which ticker window this batch belongs to (`24h` or `7d`).
   * @param symbols - The symbols that were requested.
   * @param fetched - Whatever tickers were actually returned (possibly a subset, possibly empty on error).
   * @returns One ticker per requested symbol that has ever been seen for this window; halted/never-seen symbols are omitted.
   */
  private mergeTickers(window: '24h' | '7d', symbols: string[], fetched: BinanceTicker[]): BinanceTicker[] {
    const now = Date.now();
    const bySymbol = new Map<string, BinanceTicker>();
    fetched.forEach((t) => {
      // Only a usable price is allowed to become the new last-known-good.
      // A halted symbol comes back present but priced at zero; letting it
      // through would overwrite the real price and serve $0 from then on.
      if (!Binance.isUsable(t)) return;
      bySymbol.set(t.symbol, t);
      this.lastGoodTicker.set(`${window}:${t.symbol}`, { ticker: t, at: now });
    });
    return symbols
      .map((s) => bySymbol.get(s) ?? this.lastGoodTicker.get(`${window}:${s}`)?.ticker)
      .filter((t): t is BinanceTicker => !!t);
  }

  /**
   * Age in milliseconds of the last-known-good price for a symbol, or null if
   * none has ever been recorded for the requested window(s). Lets a caller
   * distinguish a live price from one carried through a long halt, which the
   * ticker itself cannot express.
   *
   * @param symbol - The Binance symbol, e.g. `TSLABUSDT`.
   * @param window - Which window's last-known-good entry to check (`24h` or
   * `7d`). Omit to get the freshest of the two — the age of whichever window
   * priced most recently — which is what a caller asking "how stale is this
   * symbol overall" generally wants.
   * @returns Age in ms, or null when the symbol has never priced successfully
   * for the requested window (or for either window, when unspecified).
   */
  lastGoodAgeMs(symbol: string, window?: '24h' | '7d'): number | null {
    if (window) {
      const entry = this.lastGoodTicker.get(`${window}:${symbol}`);
      return entry ? Date.now() - entry.at : null;
    }
    const ages = (['24h', '7d'] as const)
      .map((w) => this.lastGoodTicker.get(`${w}:${symbol}`))
      .filter((e): e is { ticker: BinanceTicker; at: number } => !!e)
      .map((e) => Date.now() - e.at);
    return ages.length ? Math.min(...ages) : null;
  }

  /**
   * Whether the price currently served for a symbol comes from a live quote
   * rather than the last-known-good backfill.
   *
   * `mergeTickers` returns a plain `BinanceTicker` whether it was fetched or
   * carried, so a caller cannot tell the two apart from the returned value —
   * and a carried price is a valid, positive number, which makes the
   * difference invisible to any price check. A batch answered from
   * `quoteCache` legitimately carries a price up to one cache TTL old, so
   * anything within that window is live; past it, nothing has priced the
   * symbol since, so every batch in between was backfilled.
   *
   * @param symbol - The Binance symbol, e.g. `TSLABUSDT`.
   * @param window - Which ticker window to check (`24h` or `7d`).
   * @returns True when the symbol priced live within the quote-cache window.
   */
  pricedFresh(symbol: string, window: '24h' | '7d'): boolean {
    const age = this.lastGoodAgeMs(symbol, window);
    return age !== null && age <= QUOTE_CACHE_MS;
  }

  /**
   * Retrieves the tokenised-asset universe (bStocks), filtered to those with a BSC contract.
   *
   * Cached for 1 hour.
   *
   * @returns The BSC-listed tokenised assets.
   */
  async getTokenisedAssets(): Promise<BinanceTokenisedAsset[]> {
    const key = 'tokenised';
    if (this.longCache.has(key)) return this.longCache.get(key) as BinanceTokenisedAsset[];

    try {
      const res = await this.assetApi.get('bapi/asset/v2/public/asset/asset/get-tokenised-asset');
      const assets = this.filterBscAssets(res.data?.data ?? []);
      this.longCache.set(key, assets);
      return assets;
    } catch (err) {
      log.error('Error getting tokenised assets from Binance');
      log.error(err);
      // Negatively-cache the failure briefly (well under the 1h success TTL)
      // so a Binance outage doesn't re-spend the full ~23s AxiosWrapper retry
      // budget on every 30s refresh cycle, forever, until Binance recovers.
      this.longCache.set(key, [], { ttl: config.binanceFailureCacheMs });
      return [];
    }
  }

  /**
   * Retrieves the set of Spot symbols currently in `TRADING` status.
   *
   * A symbol dropping to `BREAK` (as happens during trading halts, e.g. around
   * a stock split) simply falls out of this set on the next refresh; callers
   * should keep serving the last-known-good ticker for it rather than treating
   * its absence here as "delisted".
   *
   * Cached for 1 hour.
   *
   * @returns The set of currently-trading symbols.
   */
  async getTradingSymbols(): Promise<Set<string>> {
    const key = 'trading';
    if (this.longCache.has(key)) return this.longCache.get(key) as Set<string>;

    try {
      const res = await this.api.get('api/v3/exchangeInfo?permissions=SPOT');
      const set = new Set<string>(
        (res.data?.symbols ?? [])
          .filter((s: { status: string }) => s.status === 'TRADING')
          .map((s: { symbol: string }) => s.symbol),
      );
      this.longCache.set(key, set);
      return set;
    } catch (err) {
      log.error('Error getting trading symbols from Binance');
      log.error(err);
      // See the matching comment in getTokenisedAssets: negatively-cache so
      // the retry storm doesn't repeat every cycle while Binance is down.
      this.longCache.set(key, new Set<string>(), { ttl: config.binanceFailureCacheMs });
      return new Set<string>();
    }
  }

  /**
   * Retrieves raw Spot klines (candlesticks) for a symbol.
   *
   * Rows come back in Binance's wire shape — `[openTime, open, high, low,
   * close, volume, closeTime, ...]` — untranslated, so callers pick the fields
   * they need. Cached for 10 minutes per symbol/interval/limit. A failed
   * request returns an empty array (and logs) rather than throwing, matching
   * the rest of this class; klines have no last-known-good store because a
   * chart can simply be retried, unlike a spot price that must keep serving.
   *
   * @param symbol - The Spot symbol, e.g. `TSLABUSDT`.
   * @param interval - Binance kline interval, e.g. `15m`, `1h`, `4h`, `1d`.
   * @param limit - Number of most-recent candles to fetch (Binance caps at 1000).
   * @returns Raw kline rows, oldest first; empty on failure.
   */
  async getKlines(symbol: string, interval: string, limit: number): Promise<(number | string)[][]> {
    const key = `kl:${symbol}:${interval}:${limit}`;
    if (this.klineCache.has(key)) return this.klineCache.get(key) as (number | string)[][];

    try {
      const res = await this.api.get(`api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
      const rows = res.data ?? [];
      this.klineCache.set(key, rows);
      return rows;
    } catch (err) {
      log.error(`Error getting klines from Binance for ${symbol}`);
      log.error(err);
      // Not cached: the next chart request may retry immediately.
      return [];
    }
  }

  /**
   * Retrieves 24h tickers for the given symbols in a single request.
   *
   * On a failed or partial refresh, missing symbols are backfilled from the
   * last-known-good store rather than dropped. Cached for 60 seconds per
   * requested symbol set.
   *
   * @param symbols - The Spot symbols to fetch (e.g. `TSLABUSDT`).
   * @returns One ticker per requested symbol that has ever been seen.
   */
  async getTicker24h(symbols: string[]): Promise<BinanceTicker[]> {
    const key = `t24:${[...symbols].sort().join(',')}`;
    if (this.quoteCache.has(key)) return this.quoteCache.get(key) as BinanceTicker[];

    let fetched: BinanceTicker[] = [];
    try {
      const res = await this.api.get(`api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(symbols))}`);
      fetched = res.data ?? [];
    } catch (err) {
      log.error('Error getting 24h tickers from Binance');
      log.error(err);
    }

    const merged = this.mergeTickers('24h', symbols, fetched);
    this.quoteCache.set(key, merged);
    return merged;
  }

  /**
   * Retrieves 7d rolling-window tickers for the given symbols, chunked to stay
   * under Binance's per-request weight cap.
   *
   * Each chunk is fetched independently, so one failing chunk never drops the
   * symbols in the others; any symbol whose chunk failed (or that was omitted,
   * e.g. a halt) is backfilled from the last-known-good store. Cached for 60
   * seconds per requested symbol set.
   *
   * @param symbols - The Spot symbols to fetch (e.g. `TSLABUSDT`).
   * @returns One ticker per requested symbol that has ever been seen.
   */
  async getTicker7d(symbols: string[]): Promise<BinanceTicker[]> {
    const key = `t7d:${[...symbols].sort().join(',')}`;
    if (this.quoteCache.has(key)) return this.quoteCache.get(key) as BinanceTicker[];

    const chunks = this.chunkSymbols(symbols);
    const fetched: BinanceTicker[] = [];
    /* eslint-disable no-await-in-loop */
    for (const chunk of chunks) {
      try {
        const res = await this.api.get(`api/v3/ticker?symbols=${encodeURIComponent(JSON.stringify(chunk))}&windowSize=7d`);
        fetched.push(...(res.data ?? []));
      } catch (err) {
        log.error('Error getting 7d tickers from Binance');
        log.error(err);
      }
    }
    /* eslint-enable no-await-in-loop */

    const merged = this.mergeTickers('7d', symbols, fetched);
    this.quoteCache.set(key, merged);
    return merged;
  }
}

export default Binance;
