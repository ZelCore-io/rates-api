import AxiosWrapper from "../../lib/axios";
import config from "../../../config";
import { makeRequestStrings } from "../../lib/utils";
import { LRUCache as LRU } from 'lru-cache';

const MAX_LENGTH_PER_REQUEST = 300;

export class LiveCoinWatch {
  private readonly apiKey: string = process.env['liveCoinWatchKey'] || config.apiKey;
  private static instance: LiveCoinWatch;
  private static axiosWrapper: AxiosWrapper;
  private readonly headers = {
    'Content-Type': 'application/json',
    'x-api-key': `${this.apiKey}`,
  };
  private cache: LRU<string, any>;

  constructor() {
    if (LiveCoinWatch.instance) {
      throw new Error("Use Singleton.getInstance()");
    }
    LiveCoinWatch.instance = this;
    LiveCoinWatch.axiosWrapper = new AxiosWrapper(config.liveCoinWatchUrl);

    this.cache = new LRU({
      max: 100, // Maximum number of items in the cache
      ttl: 1000 * 60 * 1, // Cache for 1 minutes
    });
  }

  public static getInstance(): LiveCoinWatch {
    return LiveCoinWatch.instance || new LiveCoinWatch();
  }

  private async post(endpoint: string, data: Record<string, any> = {}, params: Record<string, any> = {}): Promise<any> {
    return LiveCoinWatch.axiosWrapper.post(endpoint, data, {
      headers: this.headers,
      params: { ...params },
    });
  }

  private async _getExchangeRates(ids: string, vsCurrency = 'BTC'): Promise<any> {
    const cacheKey = `exchangeRates_${ids}_${vsCurrency}`;
    const cachedData = this.cache.get(cacheKey);

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
    const responseData = response.data;

    this.cache.set(cacheKey, responseData);

    return responseData;
  }

  public async getExchangeRates(ids: string[], vsCurrency = 'BTC'): Promise<any> {
    const newIds = makeRequestStrings(ids, MAX_LENGTH_PER_REQUEST);
    let allRates = {};
    
    for (const id of newIds) {
      const response = await this._getExchangeRates(id, vsCurrency);
      allRates = { ...allRates, ...response };
    }

    return allRates;
  }
}
