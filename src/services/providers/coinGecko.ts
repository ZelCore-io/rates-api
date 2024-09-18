import AxiosWrapper from "../../lib/axios";
import config from "../../../config";
import * as log from "../../lib/log";
import { arraySplit } from "../../lib/utils";
import { LRUCache as LRU } from 'lru-cache';
import { CoinGeckoPrice } from "../../types";

const MAX_IDS_PER_REQUEST = 250;

interface KeyUsage {
  plan: string;
  rate_limit_request_per_minute: number;
  monthly_call_credit: number;
  current_total_monthly_calls: number;
  current_remaining_monthly_calls: number;
}

export class CoinGecko {
  private readonly apiKey: string = process.env['coinGeckoKey'] || config.coinGeckoKey;
  private static instance: CoinGecko;
  private static axiosWrapper: AxiosWrapper;
  private readonly headers = {
    'Content-Type': 'application/json',
    'x-cg-pro-api-key': this.apiKey,
  };
  private cache: LRU<string, any>;

  constructor() {
    if (CoinGecko.instance) {
      throw new Error("Use Singleton.getInstance()");
    }
    CoinGecko.instance = this;
    CoinGecko.axiosWrapper = new AxiosWrapper(config.coinGeckoUrl);

    this.cache = new LRU({
      max: 100, // Maximum number of items in the cache
      ttl: 1000 * 60 * 1, // Cache for 1 minute
    });
  }

  public static getInstance(): CoinGecko {
    return CoinGecko.instance || new CoinGecko();
  }

  private async get(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    return CoinGecko.axiosWrapper.get(endpoint, {
      headers: this.headers,
      params: { ...params },
    });
  }

  public async getKeyUsage(): Promise<KeyUsage | null> {
    const cacheKey = 'keyUsage';
    const cachedData = this.cache.get(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    try {
      const response = await this.get('key');
      const data = response.data;

      this.cache.set(cacheKey, data);

      return data;
    } catch (error) {
      log.error('Error getting key usage from CoinGecko');
      log.error(error);
      return null;
    }
  }

  public async getCoinsList(includePlatform = true): Promise<any | null> {
    const cacheKey = `coinsList_${includePlatform}`;
    const cachedData = this.cache.get(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    try {
      const response = await this.get('coins/list', { include_platform: includePlatform });
      const data = response.data;

      this.cache.set(cacheKey, data);

      return data;
    } catch (error) {
      log.error('Error getting coins list from CoinGecko');
      log.error(error);
      return null;
    }
  }

  private async _getExchangeRates(ids: string, vsCurrency = 'btc'): Promise<CoinGeckoPrice[]> {
    const cacheKey = `exchangeRates_${ids}_${vsCurrency}`;
    const cachedData = this.cache.get(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    const response = await this.get('coins/markets', {
      vs_currency: vsCurrency,
      ids: ids,
      order: 'market_cap_desc',
      per_page: 250,
      page: 1,
      sparkline: false,
      price_change_percentage: '7d',
    });

    const data = response.data;

    this.cache.set(cacheKey, data);

    return data;
  }

  public async getExchangeRates(ids: string[], vsCurrency = 'btc'): Promise<CoinGeckoPrice[]> {
    const newIds = arraySplit([...new Set(ids)], MAX_IDS_PER_REQUEST).map((id) => id.join(','));
    const allRates: CoinGeckoPrice[] = [];

    for (const id of newIds) {
      const response = await this._getExchangeRates(id, vsCurrency);
      allRates.push(...response);
    }

    return allRates;
  }
}
