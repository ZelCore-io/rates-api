import AxiosWrapper from "../../lib/axios";
import config from "../../../config";
import { makeRequestStrings } from "../../lib/utils";

const MAX_LENGTH_PER_REQUEST = 300;

export class CryptoCompare {
  private readonly apiKey: string = process.env['cryptoCompareKey'] || config.apiKey;
  private static instance: CryptoCompare;
  private static axiosWrapper: AxiosWrapper;
  private readonly headers = {
    'Content-Type': 'application/json',
    'authorization': `Apikey ${this.apiKey}`,
  };
  constructor() {
    if (CryptoCompare.instance) {
      throw new Error("Use Singleton.getInstance()");
    }
    CryptoCompare.instance = this;
    CryptoCompare.axiosWrapper = new AxiosWrapper(config.cryptoCompareUrl);
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

  private async _getExchangeRates(ids: string, vsCurrency = 'BTC', ): Promise<any> {
    console.log('gettting here');
    const response = await this.get('data/pricemulti', {
      tsyms: vsCurrency,
      fsyms: ids,
    });
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