// Explicit factories rather than automocks, matching zelcoreRatesV2.spec.ts:
// loading the real provider modules builds an AxiosWrapper at import time,
// which these tests don't need.
jest.mock('../src/services/providers', () => ({
  __esModule: true,
  CoinGecko: { getInstance: jest.fn() },
  BitPay: { getInstance: jest.fn() },
  CryptoCompare: { getInstance: jest.fn() },
  LiveCoinWatch: { getInstance: jest.fn() },
}));

// eslint-disable-next-line import/first
import {
  CoinGecko, BitPay, CryptoCompare, LiveCoinWatch,
} from '../src/services/providers';
// eslint-disable-next-line import/first
import { getAll } from '../src/services/zelcoreRates';

const MockedCoinGecko = CoinGecko as jest.Mocked<typeof CoinGecko>;
const MockedBitPay = BitPay as jest.Mocked<typeof BitPay>;
const MockedCryptoCompare = CryptoCompare as jest.Mocked<typeof CryptoCompare>;
const MockedLiveCoinWatch = LiveCoinWatch as jest.Mocked<typeof LiveCoinWatch>;

beforeEach(() => {
  MockedBitPay.getInstance.mockReturnValue({
    getFiatRates: jest.fn().mockRejectedValue(new Error('down')),
  } as never);
  MockedCoinGecko.getInstance.mockReturnValue({
    getExchangeRates: jest.fn().mockRejectedValue(new Error('down')),
  } as never);
  MockedCryptoCompare.getInstance.mockReturnValue({
    getMarketData: jest.fn().mockRejectedValue(new Error('down')),
  } as never);
  MockedLiveCoinWatch.getInstance.mockReturnValue({
    getExchangeRates: jest.fn().mockRejectedValue(new Error('down')),
  } as never);
});

afterEach(() => jest.clearAllMocks());

// The markets and v2 refreshers already ask CryptoCompare for this ticker
// list as 'BTC,USD'. Asking for the same pair makes this a cache hit instead
// of a second upstream request per TTL against a quota-bound key.
it('shares the BTC,USD CryptoCompare request with the other refreshers', async () => {
  const getMarketData = jest.fn().mockResolvedValue({
    QTUM: { BTC: { PRICE: 0.00003 }, USD: { PRICE: 2.5 } },
    XEM: { USD: { PRICE: 0.01 } },
  });
  MockedCryptoCompare.getInstance.mockReturnValue({ getMarketData } as never);

  const result = await getAll();

  expect(getMarketData).toHaveBeenCalledTimes(1);
  expect(getMarketData).toHaveBeenCalledWith(expect.anything(), 'BTC,USD');
  expect(result[1].QTUM).toBe(0.00003);
  expect(result[1]).not.toHaveProperty('XEM');
  expect(result[2].errors).not.toHaveProperty('cryptocompare');
});

it('keeps CoinGecko ONG and GLINK prices when CryptoCompare is down', async () => {
  MockedCoinGecko.getInstance.mockReturnValue({
    getExchangeRates: jest.fn().mockResolvedValue([
      { symbol: 'ong', current_price: 9.7e-7 },
      { symbol: 'glink', current_price: 1.27e-8 },
    ]),
  } as never);

  const result = await getAll();

  expect(result[2].errors.cryptocompare).toBe(true);
  expect(result[1].ONG).toBe(9.7e-7);
  expect(result[1].GLINK).toBe(1.27e-8);
});

it('still prefers the CryptoCompare ONGAS and TENT prices when they exist', async () => {
  MockedCoinGecko.getInstance.mockReturnValue({
    getExchangeRates: jest.fn().mockResolvedValue([
      { symbol: 'ong', current_price: 9.7e-7 },
      { symbol: 'glink', current_price: 1.27e-8 },
    ]),
  } as never);
  MockedCryptoCompare.getInstance.mockReturnValue({
    getMarketData: jest.fn().mockResolvedValue({
      ONGAS: { BTC: { PRICE: 9.8e-7 }, USD: { PRICE: 0.08 } },
      TENT: { BTC: { PRICE: 1.3e-8 }, USD: { PRICE: 0.001 } },
    }),
  } as never);

  const result = await getAll();

  expect(result[1].ONG).toBe(9.8e-7);
  expect(result[1].GLINK).toBe(1.3e-8);
});
