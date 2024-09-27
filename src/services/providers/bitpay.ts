import AxiosWrapper from "../../lib/axios";
import config from "../../../config";
import { LRUCache as LRU } from 'lru-cache';

/**
 * Singleton class to interact with the BitPay API.
 *
 * This class provides methods to retrieve fiat currency exchange rates from the BitPay API.
 * It uses an LRU (Least Recently Used) cache to store responses and minimize API calls.
 *
 * @example
 * ```typescript
 * import { BitPay } from './bitpay';
 *
 * async function fetchRates() {
 *   const bitPay = BitPay.getInstance();
 *   const rates = await bitPay.getFiatRates();
 *   console.log('Fiat Rates:', rates);
 * }
 *
 * fetchRates();
 * ```
 */
export class BitPay {
  /**
   * The singleton instance of the BitPay class.
   * @private
   */
  private static instance: BitPay;

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
    if (BitPay.instance) {
      throw new Error("Use BitPay.getInstance()");
    }
    BitPay.instance = this;
    BitPay.axiosWrapper = new AxiosWrapper(config.bitPayUrl);

    this.cache = new LRU({
      max: 100, // Maximum number of items in the cache
      ttl: 1000 * 60 * 1, // Time to live in milliseconds (1 minute)
    });
  }

  /**
   * Returns the singleton instance of the BitPay class.
   *
   * @returns The singleton instance of BitPay.
   *
   * @example
   * ```typescript
   * const bitPay = BitPay.getInstance();
   * ```
   */
  public static getInstance(): BitPay {
    return BitPay.instance || new BitPay();
  }

  /**
   * Performs a GET request to the BitPay API.
   *
   * @private
   * @param endpoint - The API endpoint to request.
   * @param params - Optional query parameters.
   * @returns The response from the API.
   */
  private async get(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    return BitPay.axiosWrapper.get(endpoint, {
      headers: this.headers,
      params: { ...params },
    });
  }

  /**
   * Retrieves fiat currency exchange rates from the BitPay API.
   *
   * Utilizes caching to prevent unnecessary API calls. If the rates are cached and valid,
   * it returns them directly from the cache. Otherwise, it fetches new rates from the API.
   *
   * @returns The exchange rates data or `null` if an error occurs.
   *
   * @example
   * ```typescript
   * const bitPay = BitPay.getInstance();
   * const rates = await bitPay.getFiatRates();
   * console.log(rates);
   * ```
   */
  public async getFiatRates(): Promise<any | null> {
    const cacheKey = 'fiatRates';
    const cachedRates = this.cache.get(cacheKey);
    
    if (cachedRates) {
      return cachedRates;
    }

    try {
      const response = await this.get('rates/BTC');
      const data = response.data.data;

      this.cache.set(cacheKey, data);
      
      return data;
    } catch (error) {
      return null;
    }
  }
}
