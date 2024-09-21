import AxiosWrapper from "../../lib/axios";
import config from "../../../config";
import { makeRequestStrings } from "../../lib/utils";
import { LRUCache as LRU } from 'lru-cache';
import { LiveCoinWatchMarket } from "../../types";

const MAX_LENGTH_PER_REQUEST = 300;

/**
 * Singleton class to interact with the LiveCoinWatch API.
 *
 * This class provides methods to retrieve cryptocurrency exchange rates from LiveCoinWatch.
 * It handles API requests, caching, and rate limiting.
 *
 * @example
 * ```typescript
 * import { LiveCoinWatch } from './livecoinwatch';
 *
 * async function fetchExchangeRates() {
 *   const liveCoinWatch = LiveCoinWatch.getInstance();
 *   const rates = await liveCoinWatch.getExchangeRates(['BTC', 'ETH'], 'USD');
 *   console.log('Exchange Rates:', rates);
 * }
 *
 * fetchExchangeRates();
 * ```
 */
export class LiveCoinWatch {
  /**
   * The API key for authenticating with the LiveCoinWatch API.
   * @private
   */
  private readonly apiKey: string = process.env['liveCoinWatchKey'] || config.apiKey;

  /**
   * The singleton instance of the LiveCoinWatch class.
   * @private
   */
  private static instance: LiveCoinWatch;

  /**
   * AxiosWrapper instance for making HTTP requests.
   * @private
   */
  private static axiosWrapper: AxiosWrapper;

  /**
   * Default headers for API requests.
   * @private
   */
  private readonly headers = {
    'Content-Type': 'application/json',
    'x-api-key': `${this.apiKey}`,
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
    if (LiveCoinWatch.instance) {
      throw new Error("Use LiveCoinWatch.getInstance()");
    }
    LiveCoinWatch.instance = this;
    LiveCoinWatch.axiosWrapper = new AxiosWrapper(config.liveCoinWatchUrl);

    this.cache = new LRU({
      max: 100, // Maximum number of items in the cache
      ttl: 1000 * 60 * 1, // Cache for 1 minute
    });
  }

  /**
   * Returns the singleton instance of the LiveCoinWatch class.
   *
   * @returns The singleton instance of LiveCoinWatch.
   *
   * @example
   * ```typescript
   * const liveCoinWatch = LiveCoinWatch.getInstance();
   * ```
   */
  public static getInstance(): LiveCoinWatch {
    return LiveCoinWatch.instance || new LiveCoinWatch();
  }

  /**
   * Performs a POST request to the LiveCoinWatch API.
   *
   * @private
   * @param endpoint - The API endpoint to request.
   * @param data - The data to send in the body of the POST request.
   * @param params - Optional query parameters.
   * @returns The response from the API.
   */
  private async post(endpoint: string, data: Record<string, any> = {}, params: Record<string, any> = {}): Promise<any> {
    return LiveCoinWatch.axiosWrapper.post(endpoint, data, {
      headers: this.headers,
      params: { ...params },
    });
  }

  /**
   * Retrieves exchange rates for a list of cryptocurrency symbols.
   *
   * This is a private method that handles caching and individual API requests.
   *
   * @private
   * @param ids - Comma-separated string of cryptocurrency symbols (e.g., 'BTC,ETH').
   * @param vsCurrency - The target currency symbol (default is 'BTC').
   * @returns An array of `LiveCoinWatchMarket` objects containing exchange rate information.
   */
  private async _getExchangeRates(ids: string, vsCurrency = 'BTC'): Promise<LiveCoinWatchMarket[]> {
    const cacheKey = `exchangeRates_${ids}_${vsCurrency}`;
    const cachedData = this.cache.get(cacheKey) as LiveCoinWatchMarket[];

    if (cachedData) {
      return cachedData;
    }

    const data = {
      currency: vsCurrency,
      codes: ids,
      sort: 'rank',
      order: 'ascending',
      offset: 0,
      limit: 0,
      meta: true,
    };

    const response = await this.post('coins/map', data);
    const responseData: LiveCoinWatchMarket[] = response.data;

    this.cache.set(cacheKey, responseData);

    return responseData;
  }

  /**
   * Retrieves exchange rates for an array of cryptocurrency symbols.
   *
   * Handles splitting the symbols into batches to comply with API limitations.
   *
   * @param ids - An array of cryptocurrency symbols (e.g., ['BTC', 'ETH']).
   * @param vsCurrency - The target currency symbol (default is 'BTC').
   * @returns An array of `LiveCoinWatchMarket` objects containing exchange rate information.
   *
   * @example
   * ```typescript
   * const liveCoinWatch = LiveCoinWatch.getInstance();
   * const rates = await liveCoinWatch.getExchangeRates(['BTC', 'ETH'], 'USD');
   * console.log('Exchange Rates:', rates);
   * ```
   */
  public async getExchangeRates(ids: string[], vsCurrency = 'BTC'): Promise<LiveCoinWatchMarket[]> {
    const newIds = makeRequestStrings(ids, MAX_LENGTH_PER_REQUEST);
    let allRates: LiveCoinWatchMarket[] = [];
    
    for (const id of newIds) {
      const response = await this._getExchangeRates(id, vsCurrency);
      allRates = [ ...allRates, ...response ];
    }

    return allRates;
  }
}
