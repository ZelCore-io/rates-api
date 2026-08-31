import type { AxiosResponse } from 'axios';
import { AxiosWrapper } from '../src/lib/axios';
import { Binance } from '../src/services/providers/binance';
import { getBstockHistory } from '../src/services/bstocks';
import config from '../config';

jest.mock('../src/services/providers/binance');

const MockedBinance = Binance as jest.Mocked<typeof Binance>;

const TSLAB = { assetCode: 'TSLAB', assetName: 'Tesla', caList: [{ network: 'BSC', ca: '0x5b19' }] };

/** A raw Binance kline row: [openTime, open, high, low, close, volume, closeTime, ...]. */
const kline = (openTime: number, close: string, closeTime: number): (number | string)[] => [
  openTime, '100', '110', '90', close, '5', closeTime, '500', 10, '2', '200', '0',
];

function mockBinance({ assets, klines }: { assets: unknown[]; klines: (number | string)[][] }) {
  const getKlines = jest.fn().mockResolvedValue(klines);
  MockedBinance.getInstance.mockReturnValue({
    getTokenisedAssets: jest.fn().mockResolvedValue(assets),
    getKlines,
  } as never);
  return { getKlines };
}

describe('bStocks history', () => {
  it('maps klines to CoinGecko market_chart shape using close price and closeTime', async () => {
    const past = Date.now() - 60 * 60 * 1000;
    const { getKlines } = mockBinance({
      assets: [TSLAB],
      klines: [
        kline(past - 3600_000, '321.50', past - 1),
        kline(past, '326.11', past + 3599_999),
      ],
    });
    const result = await getBstockHistory('tslab', 30);
    expect(getKlines).toHaveBeenCalledWith('TSLABUSDT', '4h', 180);
    expect(result).toEqual({
      prices: [
        [past - 1, 321.5],
        [past + 3599_999, 326.11],
      ],
    });
  });

  it('clamps an in-progress candle closeTime to now', async () => {
    const future = Date.now() + 4 * 3600_000;
    mockBinance({ assets: [TSLAB], klines: [kline(Date.now(), '330.00', future)] });
    const result = await getBstockHistory('tslab', 30);
    expect(result?.prices).toHaveLength(1);
    expect(result!.prices[0][0]).toBeLessThanOrEqual(Date.now());
    expect(result!.prices[0][1]).toBe(330);
  });

  it.each([
    [1, '15m', 96],
    [7, '1h', 168],
    [30, '4h', 180],
    [90, '1d', 90],
    [365, '1d', 365],
    [1000, '1d', 1000],
  ])('selects interval and limit for %s days', async (days, interval, limit) => {
    const { getKlines } = mockBinance({ assets: [TSLAB], klines: [] });
    await getBstockHistory('tslab', days as number);
    expect(getKlines).toHaveBeenCalledWith('TSLABUSDT', interval, limit);
  });

  it('returns null for a code that is not a tokenised asset', async () => {
    const { getKlines } = mockBinance({ assets: [TSLAB], klines: [] });
    const result = await getBstockHistory('doge', 30);
    expect(result).toBeNull();
    expect(getKlines).not.toHaveBeenCalled();
  });

  it('returns null when bStocks are disabled', async () => {
    mockBinance({ assets: [TSLAB], klines: [] });
    const before = config.bStocksEnabled;
    config.bStocksEnabled = false;
    try {
      expect(await getBstockHistory('tslab', 30)).toBeNull();
    } finally {
      config.bStocksEnabled = before;
    }
  });

  it('returns empty prices when Binance serves no klines', async () => {
    mockBinance({ assets: [TSLAB], klines: [] });
    expect(await getBstockHistory('tslab', 30)).toEqual({ prices: [] });
  });
});

describe('Binance provider getKlines', () => {
  /** Builds a minimal AxiosResponse-shaped object so mockResolvedValue satisfies AxiosWrapper.get's return type. */
  const axiosResponse = <T>(data: T): AxiosResponse<T> => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as AxiosResponse<T>['config'],
  });

  const RealBinance = jest.requireActual<typeof import('../src/services/providers/binance')>('../src/services/providers/binance').Binance;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('requests the klines endpoint and caches per symbol/interval/limit', async () => {
    const binance = RealBinance.getInstance();
    const rows = [kline(1, '10', 2)];
    const getSpy = jest.spyOn(AxiosWrapper.prototype, 'get').mockResolvedValue(axiosResponse(rows));
    const first = await binance.getKlines('AAPLBUSDT', '1h', 168);
    const second = await binance.getKlines('AAPLBUSDT', '1h', 168);
    expect(first).toEqual(rows);
    expect(second).toEqual(rows);
    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(getSpy).toHaveBeenCalledWith('api/v3/klines?symbol=AAPLBUSDT&interval=1h&limit=168');
  });

  it('returns an empty array when the request fails', async () => {
    const binance = RealBinance.getInstance();
    jest.spyOn(AxiosWrapper.prototype, 'get').mockRejectedValue(new Error('boom'));
    expect(await binance.getKlines('MSFTBUSDT', '1d', 30)).toEqual([]);
  });
});
