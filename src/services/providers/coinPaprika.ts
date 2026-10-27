import AxiosWrapper from '../../lib/axios';
import config from '../../../config';

/** One point of `tickers/{id}/historical`. */
export interface CoinPaprikaHistoricalPoint {
  /** ISO 8601, e.g. `2026-10-26T00:00:00Z`. */
  timestamp: string;
  price: number | null;
}

/**
 * Singleton client for CoinPaprika's free API (no key, 20k calls a month).
 *
 * Used only by the Blockbook mirror (`services/blockbookMirror`) for coins
 * CoinGecko stopped tracking. Every method is uncached and never retried:
 * the caller owns caching, budgeting and backoff, and needs the raw error to
 * tell a 404 and a 429 (with its `Retry-After`) apart from an outage.
 *
 * @example
 * ```typescript
 * const ticker = await CoinPaprika.getInstance().getTicker('grs-groestlcoin');
 * console.log(ticker.quotes.USD.price);
 * ```
 */
export class CoinPaprika {
  private static instance: CoinPaprika;

  private readonly client: AxiosWrapper;

  constructor() {
    if (CoinPaprika.instance) {
      throw new Error('Use CoinPaprika.getInstance()');
    }
    CoinPaprika.instance = this;
    this.client = new AxiosWrapper(config.coinPaprikaUrl, 0, config.blockbookMirror.upstreamTimeoutMs);
  }

  /** Returns the singleton instance. */
  public static getInstance(): CoinPaprika {
    return CoinPaprika.instance || new CoinPaprika();
  }

  /**
   * Current ticker (`tickers/{id}`), USD quote.
   *
   * @param coinId - CoinPaprika coin id, e.g. `grs-groestlcoin`.
   * @throws The underlying Axios error on any non-2xx response or network failure.
   */
  public async getTicker(coinId: string): Promise<{ quotes?: { USD?: { price?: number | null } } }> {
    const response = await this.client.get(`tickers/${encodeURIComponent(coinId)}`, { params: { quotes: 'USD' } });
    return response.data;
  }

  /**
   * Price history (`tickers/{id}/historical`).
   *
   * The free plan serves `1d` points (00:00 UTC) up to a year back and `1h`
   * points only for a `start` within the last ~24 hours; `5m` is refused.
   *
   * @param coinId - CoinPaprika coin id.
   * @param start - `YYYY-MM-DD`, RFC 3339 or unix seconds.
   * @param interval - `1d` or `1h`.
   * @param quote - Quote currency, e.g. `usd`.
   * @throws The underlying Axios error on any non-2xx response or network failure.
   */
  public async getHistorical(coinId: string, start: string, interval: '1d' | '1h', quote = 'usd'): Promise<CoinPaprikaHistoricalPoint[]> {
    const response = await this.client.get(`tickers/${encodeURIComponent(coinId)}/historical`, {
      params: {
        start, interval, quote, limit: 5000,
      },
    });
    return response.data;
  }
}

export default CoinPaprika;
