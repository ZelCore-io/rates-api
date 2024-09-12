import AxiosWrapper from "../../lib/axios";
import config from "../../../config";
import { makeRequestStrings } from "../../lib/utils";

const MAX_LENGTH_PER_REQUEST = 300;

export class LiveCoinWatch {
  private readonly apiKey: string = process.env['liveCoinWatchKey'] || config.apiKey;
  private static instance: LiveCoinWatch;
  private static axiosWrapper: AxiosWrapper;
  private readonly headers = {
    'Content-Type': 'application/json',
    'x-api-key': `${this.apiKey}`,
  };
  constructor() {
    if (LiveCoinWatch.instance) {
      throw new Error("Use Singleton.getInstance()");
    }
    LiveCoinWatch.instance = this;
    LiveCoinWatch.axiosWrapper = new AxiosWrapper(config.liveCoinWatchUrl);
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

  private async _getExchangeRates(ids: string, vsCurrency = 'BTC', ): Promise<any> {
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
    return response.data;
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