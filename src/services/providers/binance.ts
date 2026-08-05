import { LRUCache as LRU } from 'lru-cache';
import config from '../../../config';
import * as log from '../../lib/log';
import { AxiosWrapper } from '../../lib/axios';
import { arraySplit } from '../../lib/utils';
import type { BinanceTicker, BinanceTokenisedAsset } from '../../types';

// 7d ticker window is fetched per-symbol; stay far under Binance's 200-weight/request cap.
const TICKER_CHUNK = 20;

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
  private quoteCache = new LRU<string, any>({ max: 50, ttl: 60 * 1000 });

  /**
   * Last-known-good ticker per symbol, independent of `quoteCache`'s TTL. Used to
   * backfill a symbol that a refresh omitted or that an entire refresh request
   * failed for (e.g. a CEX trading halt during a stock split), so a transient
   * gap upstream never drops the symbol from the response.
   * @private
   */
  private lastGoodTicker = new Map<string, BinanceTicker>();

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
  chunkSymbols(symbols: string[]): string[][] {
    return arraySplit(symbols, TICKER_CHUNK);
  }

  /**
   * Merges a freshly-fetched ticker batch into the last-known-good store, then
   * returns the requested symbols using the fresh value where available and
   * falling back to the last-known-good value otherwise (halted/omitted symbol,
   * or the whole request failed and `fetched` is empty).
   *
   * @private
   * @param symbols - The symbols that were requested.
   * @param fetched - Whatever tickers were actually returned (possibly a subset, possibly empty on error).
   * @returns One ticker per requested symbol that has ever been seen; halted/never-seen symbols are omitted.
   */
  private mergeTickers(symbols: string[], fetched: BinanceTicker[]): BinanceTicker[] {
    fetched.forEach((t) => this.lastGoodTicker.set(t.symbol, t));
    const bySymbol = new Map(fetched.map((t) => [t.symbol, t]));
    return symbols
      .map((s) => bySymbol.get(s) ?? this.lastGoodTicker.get(s))
      .filter((t): t is BinanceTicker => !!t);
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
      return new Set<string>();
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
    const key = `t24:${symbols.join(',')}`;
    if (this.quoteCache.has(key)) return this.quoteCache.get(key) as BinanceTicker[];

    let fetched: BinanceTicker[] = [];
    try {
      const res = await this.api.get(`api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(symbols))}`);
      fetched = res.data ?? [];
    } catch (err) {
      log.error('Error getting 24h tickers from Binance');
      log.error(err);
    }

    const merged = this.mergeTickers(symbols, fetched);
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
    const key = `t7d:${symbols.join(',')}`;
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

    const merged = this.mergeTickers(symbols, fetched);
    this.quoteCache.set(key, merged);
    return merged;
  }
}

export default Binance;
