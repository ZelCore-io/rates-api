import { LRUCache as LRU } from 'lru-cache';
import AxiosWrapper from '../../lib/axios';
import config from '../../../config';
import * as log from '../../lib/log';
import { arraySplit } from '../../lib/utils';
import { CoinGeckoPrice } from '../../types';

const MAX_IDS_PER_REQUEST = 250;

/**
 * Interface representing the usage statistics of the CoinGecko API key.
 */
interface KeyUsage {
  plan: string;
  rate_limit_request_per_minute: number;
  monthly_call_credit: number;
  current_total_monthly_calls: number;
  current_remaining_monthly_calls: number;
}

/**
 * Singleton class to interact with the CoinGecko API.
 *
 * This class provides methods to retrieve cryptocurrency data from CoinGecko.
 * It handles API requests, caching, and rate limiting.
 *
 * @example
 * ```typescript
 * import { CoinGecko } from './coingecko';
 *
 * async function fetchRates() {
 *   const coinGecko = CoinGecko.getInstance();
 *   const rates = await coinGecko.getExchangeRates(['bitcoin', 'ethereum']);
 *   console.log('Exchange Rates:', rates);
 * }
 *
 * fetchRates();
 * ```
 */
export class CoinGecko {
  /**
   * The API key for authenticating with the CoinGecko API.
   * @private
   */
  private readonly apiKey: string = process.env.COIN_GECKO_KEY || config.coinGeckoApiKey;

  /**
   * The singleton instance of the CoinGecko class.
   * @private
   */
  private static instance: CoinGecko;

  /**
   * AxiosWrapper instance for making HTTP requests.
   * @private
   */
  private static axiosWrapper: AxiosWrapper;

  /**
   * Separate client for `market_chart/range` (price history) with retries
   * off. The shared client retries every failure three times, which turns a
   * 404 or 429 into four billed calls; the price-history path does its own
   * backoff instead. The shared client is left exactly as it was.
   * @private
   */
  private static historyClient: AxiosWrapper;

  /**
   * Default headers for API requests.
   * @private
   */
  private readonly headers = {
    'Content-Type': 'application/json',
    'x-cg-pro-api-key': this.apiKey,
  };

  /**
   * LRU cache to store API responses.
   * @private
   */
  private cache: LRU<string, any>;

  /**
   * Private constructor to enforce the singleton pattern.
   *
   * Initializes the AxiosWrapper and the LRU cache.
   *
   * @throws {Error} If an instance already exists.
   */
  constructor() {
    if (CoinGecko.instance) {
      throw new Error('Use CoinGecko.getInstance()');
    }
    CoinGecko.instance = this;
    CoinGecko.axiosWrapper = new AxiosWrapper(config.coinGeckoUrl);
    CoinGecko.historyClient = new AxiosWrapper(config.coinGeckoUrl, 0, config.priceHistory.upstreamTimeoutMs);

    this.cache = new LRU({
      max: 100, // Maximum number of items in the cache
      ttl: 1000 * 60 * 1, // Cache for 1 minute
    });
  }

  /**
   * Returns the singleton instance of the CoinGecko class.
   *
   * @returns The singleton instance of CoinGecko.
   *
   * @example
   * ```typescript
   * const coinGecko = CoinGecko.getInstance();
   * ```
   */
  public static getInstance(): CoinGecko {
    return CoinGecko.instance || new CoinGecko();
  }

  /**
   * Performs a GET request to the CoinGecko API.
   *
   * @private
   * @param endpoint - The API endpoint to request.
   * @param params - Optional query parameters.
   * @returns The response from the API.
   */
  private async get(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    return CoinGecko.axiosWrapper.get(endpoint, {
      headers: this.headers,
      params: { ...params },
    });
  }

  /**
   * Retrieves the usage statistics of the CoinGecko API key.
   *
   * Utilizes caching to prevent unnecessary API calls. If the data is cached and valid,
   * it returns it directly from the cache. Otherwise, it fetches new data from the API.
   *
   * @returns The key usage data or `null` if an error occurs.
   *
   * @example
   * ```typescript
   * const coinGecko = CoinGecko.getInstance();
   * const usage = await coinGecko.getKeyUsage();
   * console.log('API Key Usage:', usage);
   * ```
   */
  public async getKeyUsage(): Promise<KeyUsage | null> {
    const cacheKey = 'keyUsage';
    const cachedData = this.cache.get(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    try {
      const response = await this.get('key');
      const { data } = response;

      this.cache.set(cacheKey, data);

      return data;
    } catch (error) {
      log.error('Error getting key usage from CoinGecko');
      log.error(error);
      return null;
    }
  }

  /**
   * Retrieves a list of all coins supported by CoinGecko.
   *
   * @param includePlatform - Whether to include platform data in the response (default is `true`).
   * @returns The list of coins or `null` if an error occurs.
   *
   * @example
   * ```typescript
   * const coinGecko = CoinGecko.getInstance();
   * const coinsList = await coinGecko.getCoinsList();
   * console.log('Coins List:', coinsList);
   * ```
   */
  public async getCoinsList(includePlatform = true): Promise<any | null> {
    const cacheKey = `coinsList_${includePlatform}`;
    const cachedData = this.cache.get(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    try {
      const response = await this.get('coins/list', { include_platform: includePlatform });
      const { data } = response;

      this.cache.set(cacheKey, data);

      return data;
    } catch (error) {
      log.error('Error getting coins list from CoinGecko');
      log.error(error);
      return null;
    }
  }

  /**
   * Retrieves asset platform data from CoinGecko.
   *
   * @returns The asset platform data or `null` if an error occurs.
   *
   * @example
   * ```typescript
   * const coinGecko = CoinGecko.getInstance();
   * const assetPlatforms = await coinGecko.getAssetPlatformData();
   * console.log('Asset Platforms:', assetPlatforms);
   * ```
   */
  public async getAssetPlatformData(): Promise<any | null> {
    const cacheKey = 'assetPlatformData';
    const cachedData = this.cache.get(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    try {
      const response = await this.get('asset_platforms');
      const { data } = response;

      this.cache.set(cacheKey, data);

      return data;
    } catch (error) {
      log.error('Error getting asset platform data from CoinGecko');
      log.error(error);
      return null;
    }
  }

  /**
   * Retrieves one coin's price history between two unix timestamps
   * (`coins/{id}/market_chart/range`).
   *
   * Uncached, unguarded and never retried on purpose: the caller
   * (`services/priceHistory`) owns caching, budgeting and backoff, and needs
   * the raw error so it can tell an unknown id (404) and a rate limit (429,
   * with its `Retry-After`) apart from an outage.
   *
   * @param id - CoinGecko coin id, e.g. `bitcoin`.
   * @param vsCurrency - Target currency, e.g. `eur`.
   * @param from - Range start, unix seconds.
   * @param to - Range end, unix seconds.
   * @returns CoinGecko's `market_chart` payload; only `prices` is used here.
   * @throws The underlying Axios error on any non-2xx response or network failure.
   *
   * @example
   * ```typescript
   * const { prices } = await CoinGecko.getInstance().getMarketChartRange('bitcoin', 'eur', 1514764800, 1546300799);
   * ```
   */
  public async getMarketChartRange(id: string, vsCurrency: string, from: number, to: number): Promise<{ prices: [number, number | null][] }> {
    const response = await CoinGecko.historyClient.get(`coins/${encodeURIComponent(id)}/market_chart/range`, {
      headers: this.headers,
      params: { vs_currency: vsCurrency, from, to },
    });
    return response.data;
  }

  /**
   * Retrieves exchange rates for a list of coin IDs.
   *
   * @private
   * @param ids - Comma-separated string of coin IDs.
   * @param vsCurrency - The target currency (default is 'btc').
   * @returns An array of `CoinGeckoPrice` objects.
   */
  private async _getExchangeRates(ids: string, vsCurrency = 'btc'): Promise<CoinGeckoPrice[]> {
    const cacheKey = `exchangeRates_${ids}_${vsCurrency}`;
    const cachedData = this.cache.get(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    const response = await this.get('coins/markets', {
      vs_currency: vsCurrency,
      ids,
      order: 'market_cap_desc',
      per_page: 250,
      page: 1,
      sparkline: false,
      price_change_percentage: '7d',
    });

    const { data } = response;

    this.cache.set(cacheKey, data);

    return data;
  }

  /**
   * Retrieves exchange rates for an array of coin IDs.
   *
   * Handles splitting the IDs into batches to comply with API limitations.
   *
   * @param ids - An array of coin IDs.
   * @param vsCurrency - The target currency (default is 'btc').
   * @returns An array of `CoinGeckoPrice` objects.
   *
   * @example
   * ```typescript
   * const coinGecko = CoinGecko.getInstance();
   * const rates = await coinGecko.getExchangeRates(['bitcoin', 'ethereum', 'litecoin']);
   * console.log('Exchange Rates:', rates);
   * ```
   */
  public async getExchangeRates(ids: string[], vsCurrency = 'btc'): Promise<CoinGeckoPrice[]> {
    const newIds = arraySplit([...new Set(ids)], MAX_IDS_PER_REQUEST).map((id) => id.join(','));
    const allRates: CoinGeckoPrice[] = [];

    for (const id of newIds) {
      // eslint-disable-next-line no-await-in-loop -- deliberately sequential: one id per request keeps us inside the upstream rate limit.
      const response = await this._getExchangeRates(id, vsCurrency);
      allRates.push(...response);
    }

    return allRates;
  }
}
