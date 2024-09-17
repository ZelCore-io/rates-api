import AxiosWrapper from "../../lib/axios";
import config from "../../../config";
import { makeRequestStrings } from "../../lib/utils";
import { LRUCache as LRU } from 'lru-cache';
import { CryptoCompareMarkets, CryptoComparePrice } from "../../types";

const MAX_LENGTH_PER_REQUEST = 300;

export class CryptoCompare {
  private readonly apiKey: string = process.env['cryptoCompareKey'] || config.apiKey;
  private static instance: CryptoCompare;
  private static axiosWrapper: AxiosWrapper;
  private readonly headers = {
    'Content-Type': 'application/json',
    'authorization': `Apikey ${this.apiKey}`,
  };
  private cache: LRU<string, any>;

  constructor() {
    if (CryptoCompare.instance) {
      throw new Error("Use Singleton.getInstance()");
    }
    CryptoCompare.instance = this;
    CryptoCompare.axiosWrapper = new AxiosWrapper(config.cryptoCompareUrl);

    this.cache = new LRU({
      max: 100, // Maximum number of items in the cache
      ttl: 1000 * 60 * 1, // Cache for 1 minute
    });
  }

  public static getInstance(): CryptoCompare {
    return CryptoCompare.instance || new CryptoCompare();
  }

  private async get(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    return CryptoCompare.axiosWrapper.get(endpoint, {
      headers: this.headers,
      params: { ...params },
    });
  }

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

  public async getExchangeRates(ids: string[], vsCurrency = 'BTC'): Promise<CryptoComparePrice> {
    const newIds = makeRequestStrings(ids, MAX_LENGTH_PER_REQUEST);
    let allRates: CryptoComparePrice = {};

    for (const id of newIds) {
      const response = await this._getExchangeRates(id, vsCurrency);
      allRates = { ...allRates, ...response };
    }

    return allRates;
  }

  // Caching market data
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
