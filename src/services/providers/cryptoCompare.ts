import { LRUCache as LRU } from 'lru-cache';
import AxiosWrapper from '../../lib/axios';
import config from '../../../config';
import { makeRequestStrings } from '../../lib/utils';
import { CryptoCompareMarkets, CryptoComparePrice } from '../../types';

// `fsyms` is capped at 300 characters by the API; `tsyms` at 100, which is
// why several quote currencies fit in a single request.
const MAX_LENGTH_PER_REQUEST = 300;

// Long enough that the 30s refresh loop reuses one response across many
// cycles: three services call this provider, and the quota is the binding
// constraint, not freshness -- its tickers are the legacy list in
// coinAggregatorIDs.ts, nearly all of them delisted elsewhere. All three now
// share one cache key, so this is 96 requests a day per instance, down from
// ~11.5k before any of this.
const CACHE_TTL_MS = 15 * 60 * 1000;

// Ceiling on a self-imposed backoff, so one absurd `Cooldown` value cannot
// mute the provider for the life of the process.
const MAX_COOLDOWN_MS = 60 * 60 * 1000;

// Backoff after an HTTP-level refusal (401/403/429) that does not say how
// long to wait. Retrying a rejected key or a spent quota every cycle only
// spends more of it.
const DEFAULT_COOLDOWN_MS = 15 * 60 * 1000;

const BACKOFF_STATUSES = new Set([401, 403, 429]);

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
  private readonly apiKey: string = process.env.CRYPTO_COMPARE_KEY || config.cryptoCompareApiKey;

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
    authorization: `Apikey ${this.apiKey}`,
  };

  /**
   * LRU cache to store API responses.
   * @private
   */
  private cache: LRU<string, any>;

  /**
   * Epoch ms until which this provider refuses to call the API, learned from
   * the `Cooldown` the API itself reports when the account is over its limit.
   *
   * The window is re-armed by every request made while it is running, so
   * polling through a cooldown keeps it alive indefinitely -- observed on the
   * production key counting down 478 -> 164 -> 43 -> 15 seconds and then
   * jumping back to 336/406/478 as soon as the next refresh landed. Sitting
   * the window out is the only way it ever drains.
   *
   * Per instance rather than per endpoint, because the limit is per account.
   * @private
   */
  private cooldownUntil = 0;

  /**
   * Private constructor to enforce the singleton pattern.
   *
   * Initializes the AxiosWrapper and the LRU cache.
   *
   * @throws {Error} If an instance already exists.
   */
  constructor() {
    if (CryptoCompare.instance) {
      throw new Error('Use CryptoCompare.getInstance()');
    }
    CryptoCompare.instance = this;
    // No retries: each one is another call against the quota, and the shared
    // wrapper retries a 429 three times a second apart -- straight back into
    // the window it is meant to wait out. The next refresh is the retry.
    CryptoCompare.axiosWrapper = new AxiosWrapper(config.cryptoCompareUrl, 0);

    this.cache = new LRU({
      max: 100, // Maximum number of items in the cache
      ttl: CACHE_TTL_MS,
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
   * Throws when a 200 response is really a failure.
   *
   * CryptoCompare does not use HTTP status codes for quota or parameter
   * errors: it answers 200 with `{Response: 'Error', Message: ...}` and no
   * payload field. Captured live from an exhausted key:
   *
   * ```
   * HTTP:200 {"Response":"Error","Type":99,"Cooldown":406,
   *           "Message":"You are over your rate limit please upgrade your account!"}
   * ```
   *
   * Nothing rejects on its own, so without this check the caller reads a
   * missing payload as "no symbols matched" and serves an empty provider
   * while reporting success -- which is exactly how a spent quota went
   * unnoticed in production.
   *
   * A rate-limit envelope also carries `Cooldown` in seconds; that starts a
   * local backoff so the next refresh does not re-arm the window.
   *
   * @private
   * @param payload - The parsed response body.
   * @param endpoint - The endpoint that produced it, for the message.
   * @throws {Error} When the body carries an error envelope.
   */
  private assertNotAnError(payload: any, endpoint: string): void {
    // The CoinDesk-era envelope: `{Data: {}, Err: {type, message}}`, seen
    // live for a missing key.
    if (payload?.Err?.message) {
      throw new Error(`CryptoCompare ${endpoint} failed: ${payload.Err.message}`);
    }
    if (payload?.Response !== 'Error') return;

    const cooldownSeconds = Number(payload.Cooldown);
    if (Number.isFinite(cooldownSeconds) && cooldownSeconds > 0) {
      this.startCooldown(cooldownSeconds * 1000);
    }
    throw new Error(`CryptoCompare ${endpoint} failed: ${payload.Message || 'unknown error'}`);
  }

  /**
   * Starts (or extends) the local backoff, capped at {@link MAX_COOLDOWN_MS}.
   *
   * @private
   * @param ms - How long to stay off the API.
   */
  private startCooldown(ms: number): void {
    this.cooldownUntil = Math.max(this.cooldownUntil, Date.now() + Math.min(ms, MAX_COOLDOWN_MS));
  }

  /**
   * Turns an HTTP-level refusal into a cooldown and a readable error.
   *
   * The API also answers with real 401/403/429 status codes (the key-required
   * error comes back as HTTP 401). Those reject inside axios, so they never
   * reach {@link assertNotAnError}; without this they started no backoff and
   * every caller in every cycle went straight back to the API.
   *
   * @private
   * @param error - Whatever the request rejected with.
   * @param endpoint - The endpoint that produced it, for the message.
   * @throws {Error} Always.
   */
  private failFromHttpError(error: any, endpoint: string): never {
    const response = error?.response;
    if (!response) throw error;

    if (BACKOFF_STATUSES.has(response.status)) {
      const waitSeconds = Number(response.headers?.['retry-after'] ?? response.data?.Cooldown);
      this.startCooldown(Number.isFinite(waitSeconds) && waitSeconds > 0
        ? waitSeconds * 1000
        : DEFAULT_COOLDOWN_MS);
    }
    const message = response.data?.Err?.message || response.data?.Message || error.message;
    throw new Error(`CryptoCompare ${endpoint} failed: HTTP ${response.status} ${message}`);
  }

  /**
   * Refuses a request that would land inside a cooldown the API has asked us
   * to observe. Throwing here rather than returning empty keeps the failure
   * visible to the caller's error handling, at no cost upstream.
   *
   * @private
   * @param endpoint - The endpoint being skipped, for the message.
   * @throws {Error} While the cooldown is still running.
   */
  private assertNotCoolingDown(endpoint: string): void {
    const remainingMs = this.cooldownUntil - Date.now();
    if (remainingMs > 0) {
      throw new Error(`CryptoCompare ${endpoint} skipped: in cooldown for another ${Math.ceil(remainingMs / 1000)}s`);
    }
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
    this.assertNotCoolingDown(endpoint);
    try {
      return await CryptoCompare.axiosWrapper.get(endpoint, {
        headers: this.headers,
        params: { ...params },
      });
    } catch (error) {
      return this.failFromHttpError(error, endpoint);
    }
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

    this.assertNotAnError(response.data, 'data/pricemulti');
    const { data }: { data: CryptoComparePrice } = response;

    // Cached only once known good, so a failure is retried rather than
    // served from cache for the whole TTL.
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
      // eslint-disable-next-line no-await-in-loop -- deliberately sequential: one id per request keeps us inside the upstream rate limit.
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

    this.assertNotAnError(response.data, 'data/pricemultifull');
    const data: CryptoCompareMarkets = response.data.RAW;
    if (!data) {
      throw new Error('CryptoCompare data/pricemultifull returned no RAW payload');
    }

    // Cached only once known good, so a failure is retried rather than
    // served from cache for the whole TTL.
    this.cache.set(cacheKey, data);

    return data;
  }

  /**
   * Retrieves market data for an array of cryptocurrency symbols.
   *
   * Handles splitting the symbols into batches to comply with API limitations.
   *
   * @param ids - An array of cryptocurrency symbols (e.g., ['BTC', 'ETH']).
   * @param vsCurrency - Target currency symbol, or a comma-separated list of
   * them (e.g. `'BTC,USD'`) to get every quote in one request. The response
   * is keyed `[FROM][TO]`, so each symbol carries one entry per currency.
   * @returns An object containing detailed market data.
   * @throws {Error} When the API reports an error, including an exhausted quota.
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
      // eslint-disable-next-line no-await-in-loop -- deliberately sequential: one id per request keeps us inside the upstream rate limit.
      const response = await this._getMarketData(id, vsCurrency);
      allData = { ...allData, ...response };
    }

    return allData;
  }
}
