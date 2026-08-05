import type { AxiosResponse } from 'axios';
import { AxiosWrapper } from '../src/lib/axios';
import { Binance } from '../src/services/providers/binance';
import type { BinanceTicker } from '../src/types';

/** Builds a minimal AxiosResponse-shaped object so mockResolvedValue satisfies AxiosWrapper.get's return type. */
const axiosResponse = <T>(data: T): AxiosResponse<T> => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {} as AxiosResponse<T>['config'],
});

describe('Binance provider', () => {
  const binance = Binance.getInstance();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('is a singleton', () => {
    expect(Binance.getInstance()).toBe(binance);
  });

  it('filters tokenised assets to those with a BSC contract', () => {
    const assets = binance.filterBscAssets([
      { assetCode: 'TSLAB', assetName: 'Tesla', caList: [{ network: 'BSC', ca: '0x5b19' }] },
      { assetCode: 'ALABB', assetName: 'Unlaunched', caList: [] },
    ]);
    expect(assets.map((a) => a.assetCode)).toEqual(['TSLAB']);
  });

  it('chunks 7d ticker requests to 20 symbols', () => {
    const chunks = binance.chunkSymbols(Array.from({ length: 45 }, (_, i) => `S${i}USDT`));
    expect(chunks.length).toBe(3);
    expect(chunks[0].length).toBe(20);
    expect(chunks[2].length).toBe(5);
  });

  describe('getTokenisedAssets', () => {
    it('unwraps the {data:[...]} envelope, keeps only BSC-listed assets, and caches the result', async () => {
      const getSpy = jest.spyOn(AxiosWrapper.prototype, 'get').mockResolvedValue(axiosResponse({
        code: '000000',
        message: null,
        messageDetail: null,
        data: [
          { assetCode: 'TSLAB', assetName: 'Tesla (bStocks)', logo: 'https://x/logo.png', uq: 'TSLA', caList: [{ network: 'BSC', ca: '0x5b1910eaad6450e50f816082aa078c41f10c292f' }] },
          { assetCode: 'TEST1B', assetName: 'Bstock TEST1B', uq: 'BNKK', caList: [] as { network: string; ca: string }[] },
        ],
      }));

      const result = await binance.getTokenisedAssets();
      expect(result.map((a) => a.assetCode)).toEqual(['TSLAB']);
      expect(getSpy).toHaveBeenCalledWith('bapi/asset/v2/public/asset/asset/get-tokenised-asset');

      // second call within the 1h TTL must be served from cache, not the network
      await binance.getTokenisedAssets();
      expect(getSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('getTradingSymbols', () => {
    it('returns only symbols whose status is TRADING (BREAK/halted symbols excluded) and caches the result', async () => {
      const getSpy = jest.spyOn(AxiosWrapper.prototype, 'get').mockResolvedValue(axiosResponse({
        timezone: 'UTC',
        serverTime: 1785921304221,
        symbols: [
          { symbol: 'TSLABUSDT', status: 'TRADING', baseAsset: 'TSLAB', quoteAsset: 'USDT' },
          { symbol: 'USDSBUSDT', status: 'BREAK', baseAsset: 'USDSB', quoteAsset: 'USDT' },
          { symbol: 'NVDABUSDT', status: 'TRADING', baseAsset: 'NVDAB', quoteAsset: 'USDT' },
        ],
      }));

      const set = await binance.getTradingSymbols();
      expect(set).toEqual(new Set(['TSLABUSDT', 'NVDABUSDT']));
      expect(getSpy).toHaveBeenCalledWith('api/v3/exchangeInfo?permissions=SPOT');

      await binance.getTradingSymbols();
      expect(getSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('getTicker24h', () => {
    it('requests all symbols in a single call and caches the result for 60s', async () => {
      const raw: BinanceTicker[] = [
        { symbol: 'TSLABUSDT', lastPrice: '324.92000000', priceChangePercent: '0.247', quoteVolume: '3149396.46686000' },
        { symbol: 'NVDABUSDT', lastPrice: '216.05000000', priceChangePercent: '3.626', quoteVolume: '3539230.84326000' },
      ];
      const getSpy = jest.spyOn(AxiosWrapper.prototype, 'get').mockResolvedValue(axiosResponse(raw));

      const result = await binance.getTicker24h(['TSLABUSDT', 'NVDABUSDT']);
      expect(result).toEqual(raw);
      expect(getSpy).toHaveBeenCalledTimes(1);
      const calledUrl = getSpy.mock.calls[0][0];
      expect(calledUrl).toBe(`api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(['TSLABUSDT', 'NVDABUSDT']))}`);

      await binance.getTicker24h(['TSLABUSDT', 'NVDABUSDT']);
      expect(getSpy).toHaveBeenCalledTimes(1);
    });

    it('falls back to the last-known-good price for a symbol omitted on refresh (CEX halt)', async () => {
      const good: BinanceTicker = { symbol: 'MSTRBUSDT', lastPrice: '400.00000000', priceChangePercent: '1.0', quoteVolume: '1000000' };
      const getSpy = jest.spyOn(AxiosWrapper.prototype, 'get');

      // first request establishes a known-good price for MSTRBUSDT
      getSpy.mockResolvedValueOnce(axiosResponse([good]));
      const first = await binance.getTicker24h(['MSTRBUSDT']);
      expect(first).toEqual([good]);

      // second request (different symbol set -> new cache key) omits MSTRBUSDT.
      // NOTE: omission is NOT what a real halt looks like -- see the zero-price
      // test below. This covers the genuinely-absent case only.
      const other: BinanceTicker = { symbol: 'AMDBUSDT', lastPrice: '150.00000000', priceChangePercent: '2.0', quoteVolume: '500000' };
      getSpy.mockResolvedValueOnce(axiosResponse([other]));
      const second = await binance.getTicker24h(['MSTRBUSDT', 'AMDBUSDT']);

      expect(second).toEqual(expect.arrayContaining([good, other]));
      expect(second.find((t) => t.symbol === 'MSTRBUSDT')).toEqual(good);
    });

    it('treats a halted symbol priced at zero as unusable and keeps the last-known-good price', async () => {
      // Measured against live Binance data: requesting 20 BREAK-status symbols
      // returned all 20 PRESENT, and 9 of them carried lastPrice "0.00000000".
      // Binance does not omit a halted symbol -- so a presence check alone never
      // triggers the fallback, and accepting the zero would both serve $0 and
      // overwrite the real price for good.
      const good: BinanceTicker = { symbol: 'GOOGLBUSDT', lastPrice: '180.00000000', priceChangePercent: '1.0', quoteVolume: '900000' };
      const getSpy = jest.spyOn(AxiosWrapper.prototype, 'get');

      getSpy.mockResolvedValueOnce(axiosResponse([good]));
      expect(await binance.getTicker24h(['GOOGLBUSDT'])).toEqual([good]);

      // The halt: symbol present, price zeroed.
      const halted: BinanceTicker = { symbol: 'GOOGLBUSDT', lastPrice: '0.00000000', priceChangePercent: '0.0', quoteVolume: '0' };
      const filler: BinanceTicker = { symbol: 'METABUSDT', lastPrice: '500.00000000', priceChangePercent: '0.2', quoteVolume: '100000' };
      getSpy.mockResolvedValueOnce(axiosResponse([halted, filler]));
      const during = await binance.getTicker24h(['GOOGLBUSDT', 'METABUSDT']);
      expect(during.find((t) => t.symbol === 'GOOGLBUSDT')).toEqual(good);

      // ...and the zero must not have poisoned the store: a later total failure
      // still serves the real price rather than $0.
      getSpy.mockRejectedValueOnce(new Error('network down'));
      const after = await binance.getTicker24h(['GOOGLBUSDT', 'AMZNBUSDT']);
      expect(after.find((t) => t.symbol === 'GOOGLBUSDT')).toEqual(good);
    });

    it('reports the age of a last-known-good price, and null for a symbol never priced', async () => {
      const good: BinanceTicker = { symbol: 'ORCLBUSDT', lastPrice: '120.00000000', priceChangePercent: '1.0', quoteVolume: '10000' };
      const getSpy = jest.spyOn(AxiosWrapper.prototype, 'get');
      getSpy.mockResolvedValueOnce(axiosResponse([good]));
      await binance.getTicker24h(['ORCLBUSDT']);

      expect(binance.lastGoodAgeMs('ORCLBUSDT')).toBeGreaterThanOrEqual(0);
      expect(binance.lastGoodAgeMs('NEVERSEENUSDT')).toBeNull();
    });

    it('serves the last-known-good ticker for requested symbols when the whole refresh request rejects', async () => {
      const good: BinanceTicker = { symbol: 'CRCLBUSDT', lastPrice: '90.00000000', priceChangePercent: '0.5', quoteVolume: '2000000' };
      const getSpy = jest.spyOn(AxiosWrapper.prototype, 'get');

      getSpy.mockResolvedValueOnce(axiosResponse([good]));
      await binance.getTicker24h(['CRCLBUSDT']);

      // a different symbol combination forces a fresh network call, which this time fails outright
      getSpy.mockRejectedValueOnce(new Error('network blip'));
      const result = await binance.getTicker24h(['CRCLBUSDT', 'ZZZUSDT']);

      expect(result).toEqual([good]);
    });
  });

  describe('getTicker7d', () => {
    it('chunks requests to <=20 symbols per call, tags windowSize=7d, and merges all chunk results', async () => {
      const symbols = Array.from({ length: 25 }, (_, i) => `S${i}USDT`);
      const getSpy = jest.spyOn(AxiosWrapper.prototype, 'get').mockImplementation(async (url?: string) => {
        const match = (url || '').match(/symbols=([^&]+)/);
        const requested: string[] = JSON.parse(decodeURIComponent(match ? match[1] : '[]'));
        const data: BinanceTicker[] = requested.map((symbol) => ({
          symbol, lastPrice: '1.00', priceChangePercent: '0.0', quoteVolume: '1',
        }));
        return axiosResponse(data);
      });

      const result = await binance.getTicker7d(symbols);
      expect(getSpy).toHaveBeenCalledTimes(2);
      expect(getSpy.mock.calls[0][0]).toContain('windowSize=7d');
      expect(result.length).toBe(25);
      expect(result.map((t) => t.symbol).sort()).toEqual([...symbols].sort());
    });
  });
});
