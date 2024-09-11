import AxiosWrapper from "../../lib/axios";
import config from "../../../config";

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
  constructor() {
    if (CoinGecko.instance) {
      throw new Error("Use Singleton.getInstance()");
    }
    CoinGecko.instance = this;
    CoinGecko.axiosWrapper = new AxiosWrapper(config.coinGeckoUrl);
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
    try {
      const response = await this.get('key');
      return response.data;
    } catch (error) {
      return null;
    }
  }

  public async getCoinsList(includePlatform = true): Promise<any | null> {
    try {
      const response = await this.get('coins/list', { include_platform: includePlatform });
      return response.data;
    } catch (error) {
      return null;
    }
  }

  public async getExchangeRates(ids: string, vsCurrency = 'btc', ): Promise<any | null> {
    console.log("Running here");
    try {
      const response = await this.get('coins/markets', {
        vs_currency: vsCurrency,
        ids: ids,
        order: 'market_cap_desc',
        per_page: 250,
        page: 1,
        sparkline: false,
      });
      return response.data;
    } catch (error) {
      return null;
    }
  }

  public async getAllExchangeRates(ids: string[], vsCurrency = 'btc'): Promise<any | null> {
    const allRates = [];
    for (const id of ids) {
      const response = await this.getExchangeRates(id, vsCurrency);
      allRates.push(response);
    }
    return allRates
      .filter((rate) => rate !== null)
      .reduce((acc, val) => acc.concat(val), []);
  }

}