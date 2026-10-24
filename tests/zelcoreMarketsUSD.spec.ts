// Explicit factories rather than automocks, matching zelcoreRatesV2.spec.ts:
// loading the real provider modules builds an AxiosWrapper at import time,
// which these tests don't need.
jest.mock('../src/services/providers', () => ({
  __esModule: true,
  CoinGecko: { getInstance: jest.fn() },
  CryptoCompare: { getInstance: jest.fn() },
  LiveCoinWatch: { getInstance: jest.fn() },
}));

// eslint-disable-next-line import/first
import { CoinGecko, CryptoCompare, LiveCoinWatch } from '../src/services/providers';
// eslint-disable-next-line import/first
import { getAll } from '../src/services/zelcoreMarketsUSD';

const MockedCoinGecko = CoinGecko as jest.Mocked<typeof CoinGecko>;
const MockedCryptoCompare = CryptoCompare as jest.Mocked<typeof CryptoCompare>;
const MockedLiveCoinWatch = LiveCoinWatch as jest.Mocked<typeof LiveCoinWatch>;

beforeEach(() => {
  MockedCoinGecko.getInstance.mockReturnValue({
    getMarketData: jest.fn().mockRejectedValue(new Error('down')),
    getExchangeRates: jest.fn().mockRejectedValue(new Error('down')),
  } as never);
  MockedLiveCoinWatch.getInstance.mockReturnValue({
    getExchangeRates: jest.fn().mockRejectedValue(new Error('down')),
    getMarketData: jest.fn().mockRejectedValue(new Error('down')),
  } as never);
});

afterEach(() => jest.clearAllMocks());

// The provider caches per `${ids}_${vsCurrency}`, so asking for 'USD' here
// while zelcoreRatesV2 asks the same ticker list for 'BTC,USD' is a second
// cache key and therefore a second upstream request per window. Requesting
// the same pair makes this a cache hit and costs nothing extra: the USD leg
// read below is identical either way.
it('requests the same quote pair as the rates refresher so the two share one cached response', async () => {
  const getMarketData = jest.fn().mockResolvedValue({
    QTUM: {
      BTC: { PRICE: 0.00003 },
      USD: {
        PRICE: 2.5, SUPPLY: 100, TOTALVOLUME24HTO: 200, CHANGEPCT24HOUR: 1.5, MKTCAP: 300,
      },
    },
  });
  MockedCryptoCompare.getInstance.mockReturnValue({ getMarketData } as never);

  const result = await getAll();

  expect(getMarketData).toHaveBeenCalledTimes(1);
  expect(getMarketData).toHaveBeenCalledWith(expect.anything(), 'BTC,USD');
  expect(result[0].QTUM).toEqual({
    supply: 100, volume: 200, change: 1.5, market: 300,
  });
});

// LiveCoinWatch's `delta` is the ratio to the period's opening rate, so 1.02
// is a 2% rise. It used to be read as (1 - delta), flipping every sign.
it('reads LiveCoinWatch deltas as gains above 1 and losses below it', async () => {
  MockedCryptoCompare.getInstance.mockReturnValue({
    getMarketData: jest.fn().mockRejectedValue(new Error('down')),
  } as never);
  MockedLiveCoinWatch.getInstance.mockReturnValue({
    getExchangeRates: jest.fn().mockResolvedValue([{
      code: 'KDL', rate: 2, circulatingSupply: 10, volume: 5, rank: 7, totalSupply: 20, cap: 20, delta: { day: 1.02, week: 0.9 },
    }]),
  } as never);

  const result = await getAll();

  expect(result[0].KDL.change).toBeCloseTo(2);
  expect(result[0].KDL.change7d).toBeCloseTo(-10);
});

// ONGAS (and TENT) are CryptoCompare tickers. With that provider down the
// alias used to overwrite CoinGecko's ONG row with undefined.
it('keeps CoinGecko ONG and GLINK rows when CryptoCompare is down', async () => {
  MockedCryptoCompare.getInstance.mockReturnValue({
    getMarketData: jest.fn().mockRejectedValue(new Error('down')),
  } as never);
  MockedCoinGecko.getInstance.mockReturnValue({
    getExchangeRates: jest.fn().mockResolvedValue([
      { symbol: 'ong', market_cap_rank: 550, circulating_supply: 1, total_volume: 2, market_cap: 3 },
      { symbol: 'glink', market_cap_rank: 9000, circulating_supply: 4, total_volume: 5, market_cap: 6 },
    ]),
  } as never);

  const result = await getAll();

  expect(result[1].errors.cryptocompare).toBe(true);
  expect(result[0].ONG).toMatchObject({ rank: 550, market: 3 });
  expect(result[0].GLINK).toMatchObject({ rank: 9000, market: 6 });
});
