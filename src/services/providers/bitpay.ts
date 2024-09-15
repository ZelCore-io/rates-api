import AxiosWrapper from "../../lib/axios";
import config from "../../../config";
import { LRUCache as LRU } from 'lru-cache';

export class BitPay {
  private static instance: BitPay;
  private static axiosWrapper: AxiosWrapper;
  private readonly headers = {
    'Content-Type': 'application/json',
  };
  private cache: LRU<string, any>;

  constructor() {
    if (BitPay.instance) {
      throw new Error("Use Singleton.getInstance()");
    }
    BitPay.instance = this;
    BitPay.axiosWrapper = new AxiosWrapper(config.bitPayUrl);

    this.cache = new LRU({
      max: 100, // Maximum number of items in the cache
      ttl: 1000 * 60 * 1, // Time to live in milliseconds (1 minutes)
    });
  }

  public static getInstance(): BitPay {
    return BitPay.instance || new BitPay();
  }

  private async get(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    return BitPay.axiosWrapper.get(endpoint, {
      headers: this.headers,
      params: { ...params },
    });
  }

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
