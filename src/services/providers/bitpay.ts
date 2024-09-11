import AxiosWrapper from "../../lib/axios";
import config from "../../../config";


export class BitPay {
  private static instance: BitPay;
  private static axiosWrapper: AxiosWrapper;
  private readonly headers = {
    'Content-Type': 'application/json',
  };
  constructor() {
    if (BitPay.instance) {
      throw new Error("Use Singleton.getInstance()");
    }
    BitPay.instance = this;
    BitPay.axiosWrapper = new AxiosWrapper(config.bitPayUrl);
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
    try {
      const response = await this.get('rates/BTC');
      return response.data;
    } catch (error) {
      return null;
    }
  }

}