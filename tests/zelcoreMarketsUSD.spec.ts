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
