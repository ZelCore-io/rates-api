// Explicit factories (rather than bare `jest.mock(path)` automocks) so Jest
// never has to load the real provider modules -- each one wires up a real
// AxiosWrapper/axios instance at import time, which is unrelated overhead
// these tests don't need and which was observed to leave the test process
// hanging past its normal exit.
jest.mock('../src/services/providers', () => ({
  __esModule: true,
  CoinGecko: { getInstance: jest.fn() },
  BitPay: { getInstance: jest.fn() },
  CryptoCompare: { getInstance: jest.fn() },
  LiveCoinWatch: { getInstance: jest.fn() },
}));
jest.mock('../src/services/bstocks', () => ({
  __esModule: true,
  getBstockPrices: jest.fn(),
  isBstocksDegraded: jest.fn(),
}));

// eslint-disable-next-line import/first
import { CoinGecko, BitPay, CryptoCompare, LiveCoinWatch } from '../src/services/providers';
// eslint-disable-next-line import/first
import { getBstockPrices, isBstocksDegraded } from '../src/services/bstocks';
// eslint-disable-next-line import/first
import { getAll } from '../src/services/zelcoreRatesV2';
// eslint-disable-next-line import/first
import { coinAggregatorIDs } from '../src/services/coinAggregatorIDs';
// eslint-disable-next-line import/first
import type { CryptoPrice } from '../src/types';

const MockedCoinGecko = CoinGecko as jest.Mocked<typeof CoinGecko>;
const MockedBitPay = BitPay as jest.Mocked<typeof BitPay>;
const MockedCryptoCompare = CryptoCompare as jest.Mocked<typeof CryptoCompare>;
const MockedLiveCoinWatch = LiveCoinWatch as jest.Mocked<typeof LiveCoinWatch>;
const mockedGetBstockPrices = getBstockPrices as jest.MockedFunction<typeof getBstockPrices>;
const mockedIsBstocksDegraded = isBstocksDegraded as jest.MockedFunction<typeof isBstocksDegraded>;

beforeEach(() => {
  // All non-bStock providers fail fast (rejected) so these tests exercise
  // only the bStocks leg of getAll() without needing real market fixtures.
  MockedCoinGecko.getInstance.mockReturnValue({
    getExchangeRates: jest.fn().mockRejectedValue(new Error('down')),
  } as never);
  MockedBitPay.getInstance.mockReturnValue({
    getFiatRates: jest.fn().mockRejectedValue(new Error('down')),
  } as never);
  MockedCryptoCompare.getInstance.mockReturnValue({
    getMarketData: jest.fn().mockRejectedValue(new Error('down')),
  } as never);
  MockedLiveCoinWatch.getInstance.mockReturnValue({
    getExchangeRates: jest.fn().mockRejectedValue(new Error('down')),
  } as never);
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.clearAllMocks();
});

// Finding 4: a total Binance outage costs up to ~92s inside getBstockPrices()
// (AxiosWrapper's retry budget across two sequential calls plus a 3-chunk
// loop). getAll() awaited that serially, so it -- and therefore the refresh
// of all 364 non-bStock assets behind it -- would stall for just as long.
it('bounds the bStocks fetch to 10s so a hung/slow Binance outage cannot stall the whole refresh', async () => {
  jest.useFakeTimers();
  mockedGetBstockPrices.mockImplementation(() => new Promise<CryptoPrice[]>(() => {})); // never resolves
  mockedIsBstocksDegraded.mockReturnValue(false);

  const resultPromise = getAll();
  let resolved: Awaited<ReturnType<typeof getAll>> | undefined;
  resultPromise.then((r) => { resolved = r; });

  await jest.advanceTimersByTimeAsync(10_000);
  expect(resolved).toBeDefined();
  expect(resolved!.crypto.some((c) => c.id.startsWith('bstock-'))).toBe(false);
});

// Finding 3a: getBstockPrices() never rejects (every failure is caught
// internally), so a total outage must be surfaced via isBstocksDegraded()
// rather than the (unreachable) catch block.
it('sets errors.binance when bStocks degrades, even though getBstockPrices resolved without throwing', async () => {
  const staleRow: CryptoPrice = {
    id: 'bstock-tslab',
    provider: 'coingecko',
    rates: { usd: 300, btc: 0.005 },
    supply: 0,
    volume: 0,
    change24h: 0,
    market: 0,
    total_supply: 0,
    change7d: 0,
  };
  mockedGetBstockPrices.mockResolvedValue([staleRow]);
  mockedIsBstocksDegraded.mockReturnValue(true);

  const result = await getAll();
  expect(result.errors?.binance).toBe(true);
  expect(result.crypto.some((c) => c.id === 'bstock-tslab')).toBe(true); // stale rows still served
});

// CryptoCompare's `tsyms` takes a list (max 100 characters) and RAW is keyed
// [FROM][TO], so asking for BTC and USD in separate calls doubled the request
// count against a quota that was already exhausted in production.
it('asks CryptoCompare for both quote currencies in a single request', async () => {
  const getMarketData = jest.fn().mockResolvedValue({
    QTUM: {
      BTC: { PRICE: 0.00003 },
      USD: {
        PRICE: 2.5, SUPPLY: 100, VOLUME24HOURTO: 200, CHANGEPCT24HOUR: 1.5, MKTCAP: 300, TOTALVOLUME24H: 400,
      },
    },
  });
  MockedCryptoCompare.getInstance.mockReturnValue({ getMarketData } as never);
  mockedGetBstockPrices.mockResolvedValue([]);
  mockedIsBstocksDegraded.mockReturnValue(false);

  const result = await getAll();

  expect(getMarketData).toHaveBeenCalledTimes(1);
  expect(getMarketData).toHaveBeenCalledWith(expect.anything(), 'BTC,USD');
  const row = result.crypto.find((c) => c.id === 'QTUM');
  expect(row?.rates).toEqual({ btc: 0.00003, usd: 2.5 });
  expect(result.errors?.cryptocompare).toBeUndefined();
});

// Released wallets bundle coininfo.json and look these assets up as
// `cryptocompare-<ID>` only, with no fallback to another provider.
describe('coins moved off CryptoCompare', () => {
  const lcwQsp = {
    code: 'QSP', rate: 0.0005, rank: 900, circulatingSupply: 700, volume: 240, cap: 350, totalSupply: 1000, delta: { day: 1.02, week: 0.9 },
  };
  const cgGemlink = {
    id: 'gemlink', current_price: 0.001, circulating_supply: 10, total_volume: 5, price_change_percentage_24h: 1, market_cap: 10, market_cap_rank: 5000, total_supply: 20, price_change_percentage_7d_in_currency: 2,
  };

  beforeEach(() => {
    MockedCoinGecko.getInstance.mockReturnValue({
      getExchangeRates: jest.fn().mockResolvedValue([cgGemlink]),
    } as never);
    MockedLiveCoinWatch.getInstance.mockReturnValue({
      getExchangeRates: jest.fn().mockResolvedValue([lcwQsp]),
    } as never);
    MockedCryptoCompare.getInstance.mockReturnValue({
      getMarketData: jest.fn().mockResolvedValue({}),
    } as never);
    mockedGetBstockPrices.mockResolvedValue([]);
    mockedIsBstocksDegraded.mockReturnValue(false);
  });

  it('are priced by the providers they moved to', () => {
    expect(coinAggregatorIDs.cryptoCompare).toEqual([]);
    expect(coinAggregatorIDs.livecoinwatch).toContain('QSP');
    expect(coinAggregatorIDs.coingecko).toContain('gemlink');
  });

  it('are served under the cryptocompare IDs released wallets look up', async () => {
    const result = await getAll();

    const qsp = result.crypto.find((c) => c.provider === 'cryptocompare' && c.id === 'QSP');
    const tent = result.crypto.find((c) => c.provider === 'cryptocompare' && c.id === 'TENT');
    expect(qsp?.rates).toEqual({ btc: 0.0005, usd: 0.0005 });
    expect(tent?.rates).toEqual({ btc: 0.001, usd: 0.001 });
    expect(result.crypto.some((c) => c.provider === 'livecoinwatch' && c.id === 'QSP')).toBe(true);
    expect(result.errors?.cryptocompare).toBeUndefined();
  });

  it('never shadow a row CryptoCompare itself returned', async () => {
    MockedCryptoCompare.getInstance.mockReturnValue({
      getMarketData: jest.fn().mockResolvedValue({
        QSP: { BTC: { PRICE: 0.0000001 }, USD: { PRICE: 0.007 } },
      }),
    } as never);

    const result = await getAll();

    const qspRows = result.crypto.filter((c) => c.provider === 'cryptocompare' && c.id === 'QSP');
    expect(qspRows).toHaveLength(1);
    expect(qspRows[0].rates).toEqual({ btc: 0.0000001, usd: 0.007 });
  });
});

it('does not set errors.binance when bStocks is healthy', async () => {
  mockedGetBstockPrices.mockResolvedValue([]);
  mockedIsBstocksDegraded.mockReturnValue(false);

  const result = await getAll();
  expect(result.errors?.binance).toBeUndefined();
});
