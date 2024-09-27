import AxiosWrapper from "../../lib/axios";
import config from "../../../config";
import { makeRequestStrings } from "../../lib/utils";
import { LRUCache as LRU } from 'lru-cache';
import { CryptoCompareMarkets, CryptoComparePrice } from "../../types";

const MAX_LENGTH_PER_REQUEST = 300;

/**
 * Singleton class to interact with the CryptoCompare API.
 *
 * This class provides methods to retrieve cryptocurrency exchange rates and market data from CryptoCompare.
 * It handles API requests, caching, and rate limiting.
 *
 * @example
 * ```typescript
 * import { CryptoCompare } from './cryptocompare';
 *
 * async function fetchExchangeRates() {
 *   const cryptoCompare = CryptoCompare.getInstance();
 *   const rates = await cryptoCompare.getExchangeRates(['BTC', 'ETH']);
 *   console.log('Exchange Rates:', rates);
 * }
 *
 * fetchExchangeRates();
 * ```
 */
export class CryptoCompare {
  /**
   * The API key for authenticating with the CryptoCompare API.
   * @private
   */
  private readonly apiKey: string = process.env['cryptoCompareKey'] || config.apiKey;

  /**
   * The singleton instance of the CryptoCompare class.
   * @private
   */
  private static instance: CryptoCompare;

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
    'authorization': `Apikey ${this.apiKey}`,
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
    if (CryptoCompare.instance) {
      throw new Error("Use CryptoCompare.getInstance()");
    }
    CryptoCompare.instance = this;
    CryptoCompare.axiosWrapper = new AxiosWrapper(config.cryptoCompareUrl);

    this.cache = new LRU({
      max: 100, // Maximum number of items in the cache
      ttl: 1000 * 60 * 1, // Cache for 1 minute
    });
  }

  /**
   * Returns the singleton instance of the CryptoCompare class.
   *
   * @returns The singleton instance of CryptoCompare.
   *
   * @example
   * ```typescript
   * const cryptoCompare = CryptoCompare.getInstance();
   * ```
   */
  public static getInstance(): CryptoCompare {
    return CryptoCompare.instance || new CryptoCompare();
  }

  /**
   * Performs a GET request to the CryptoCompare API.
   *
   * @private
   * @param endpoint - The API endpoint to request.
   * @param params - Optional query parameters.
   * @returns The response from the API.
   */
  private async get(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    return CryptoCompare.axiosWrapper.get(endpoint, {
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
   * @returns An object mapping cryptocurrency symbols to their exchange rates.
   *
   * @example
   * ```typescript
   * const rates = await cryptoCompare._getExchangeRates('BTC,ETH', 'USD');
   * ```
   */
  private async _getExchangeRates(ids: string, vsCurrency = 'BTC'): Promise<CryptoComparePrice> {
    const cacheKey = `exchangeRates_${ids}_${vsCurrency}`;
    const cachedData = this.cache.get(cacheKey) as CryptoComparePrice;

    if (cachedData) {
      return cachedData;
    }

    const response = await this.get('data/pricemulti', {
      tsyms: vsCurrency,
      fsyms: ids,
    });

    const data: CryptoComparePrice = response.data;

    // Store in cache
    this.cache.set(cacheKey, data);

    return data;
  }

  /**
   * Retrieves exchange rates for an array of cryptocurrency symbols.
   *
   * Handles splitting the symbols into batches to comply with API limitations.
   *
   * @param ids - An array of cryptocurrency symbols (e.g., ['BTC', 'ETH']).
   * @param vsCurrency - The target currency symbol (default is 'BTC').
   * @returns An object mapping cryptocurrency symbols to their exchange rates.
   *
   * @example
   * ```typescript
   * const cryptoCompare = CryptoCompare.getInstance();
   * const rates = await cryptoCompare.getExchangeRates(['BTC', 'ETH'], 'USD');
   * console.log('Exchange Rates:', rates);
   * ```
   */
  public async getExchangeRates(ids: string[], vsCurrency = 'BTC'): Promise<CryptoComparePrice> {
    const newIds = makeRequestStrings(ids, MAX_LENGTH_PER_REQUEST);
    let allRates: CryptoComparePrice = {};

    for (const id of newIds) {
      const response = await this._getExchangeRates(id, vsCurrency);
      allRates = { ...allRates, ...response };
    }

    return allRates;
  }

  /**
   * Retrieves market data for a list of cryptocurrency symbols.
   *
   * This is a private method that handles caching and individual API requests.
   *
   * @private
   * @param ids - Comma-separated string of cryptocurrency symbols (e.g., 'BTC,ETH').
   * @param vsCurrency - The target currency symbol (default is 'BTC').
   * @returns An object containing detailed market data.
   *
   * @example
   * ```typescript
   * const marketData = await cryptoCompare._getMarketData('BTC,ETH', 'USD');
   * ```
   */
  private async _getMarketData(ids: string, vsCurrency = 'BTC'): Promise<CryptoCompareMarkets> {
    const cacheKey = `marketData_${ids}_${vsCurrency}`;
    const cachedData = this.cache.get(cacheKey) as CryptoCompareMarkets;

    if (cachedData) {
      return cachedData;
    }

    const response = await this.get('data/pricemultifull', {
      tsyms: vsCurrency,
      fsyms: ids,
    });

    const data: CryptoCompareMarkets = response.data.RAW;

    this.cache.set(cacheKey, data);

    return data;
  }

  /**
   * Retrieves market data for an array of cryptocurrency symbols.
   *
   * Handles splitting the symbols into batches to comply with API limitations.
   *
   * @param ids - An array of cryptocurrency symbols (e.g., ['BTC', 'ETH']).
   * @param vsCurrency - The target currency symbol (default is 'BTC').
   * @returns An object containing detailed market data.
   *
   * @example
   * ```typescript
   * const cryptoCompare = CryptoCompare.getInstance();
   * const marketData = await cryptoCompare.getMarketData(['BTC', 'ETH'], 'USD');
   * console.log('Market Data:', marketData);
   * ```
   */
  public async getMarketData(ids: string[], vsCurrency = 'BTC'): Promise<CryptoCompareMarkets> {
    const newIds = makeRequestStrings(ids, MAX_LENGTH_PER_REQUEST);
    let allData: CryptoCompareMarkets = {};

    for (const id of newIds) {
      const response = await this._getMarketData(id, vsCurrency);
      allData = { ...allData, ...response };
    }

    return allData;
  }
}
