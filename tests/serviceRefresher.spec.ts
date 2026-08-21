import type { Response, Request } from 'express';
import type { CryptoPrice, PricesResponse } from '../src/types';

jest.mock('../src/services/zelcoreRates', () => ({
  __esModule: true,
  default: { getAll: jest.fn() },
}));
jest.mock('../src/services/zelcoreMarketsUSD', () => ({
  __esModule: true,
  default: { getAll: jest.fn() },
}));
jest.mock('../src/services/zelcoreRatesV2', () => ({
  __esModule: true,
  default: { getAll: jest.fn() },
}));

// eslint-disable-next-line import/first
import zelcoreRates from '../src/services/zelcoreRates';
// eslint-disable-next-line import/first
import zelcoreMarketsUSD from '../src/services/zelcoreMarketsUSD';
// eslint-disable-next-line import/first
import zelcoreRatesV2 from '../src/services/zelcoreRatesV2';
// eslint-disable-next-line import/first
import { serviceRefresher, getRatesV2 } from '../src/services/apiServices';

const mockedRates = zelcoreRates as jest.Mocked<typeof zelcoreRates>;
const mockedMarkets = zelcoreMarketsUSD as jest.Mocked<typeof zelcoreMarketsUSD>;
const mockedRatesV2 = zelcoreRatesV2 as jest.Mocked<typeof zelcoreRatesV2>;

function makeCoins(provider: string, count: number): CryptoPrice[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${provider}-coin-${i}`,
    provider,
    rates: { usd: 1, btc: 0.00001 },
    supply: 1,
    volume: 1,
    change24h: 1,
    market: 1,
  }));
}

function makeFiat(count: number) {
  return Array.from({ length: count }, (_, i) => ({ code: `C${i}`, name: `Currency ${i}`, rate: 1 }));
}

/** Flushes a chain of already-resolved microtasks (the sequential `await`s
 * inside serviceRefresher) without advancing the fake `delay(30s)` timer that
 * would otherwise trigger serviceRefresher's own infinite recursion. */
async function flush(steps = 25) {
  for (let i = 0; i < steps; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
}

function captureRatesV2(): PricesResponse {
  const json = jest.fn();
  getRatesV2({} as Request, { json } as unknown as Response);
  return json.mock.calls[0][0] as PricesResponse;
}

// Finding 2 + finding 7 bullet 1: serviceRefresher had zero coverage, so the
// >300 floor's interaction with replaceCryptoByKey (a small-provider outage
// silently truncating /v2/rates) went unverified.
describe('serviceRefresher — small-provider-outage carry-forward (finding 2)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockedRates.getAll.mockResolvedValue([[], {}, { errors: {} }] as never);
    mockedMarkets.getAll.mockResolvedValue([{}, { errors: {} }] as never);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('carries forward only a failed provider\'s rows and lets fresh data win everywhere else', async () => {
    // Cycle 1: every provider healthy. 320 + 39 + 2 = 361 rows, well clear of
    // the >300 floor.
    mockedRatesV2.getAll.mockResolvedValueOnce({
      crypto: [
        ...makeCoins('coingecko', 320),
        ...makeCoins('cryptocompare', 39),
        ...makeCoins('livecoinwatch', 2),
      ],
      fiat: makeFiat(25),
      errors: {},
    });
    serviceRefresher();
    await flush();

    expect(captureRatesV2().crypto).toHaveLength(361);

    // Cycle 2: CryptoCompare fails outright (0 rows), but 320 + 2 = 322 still
    // clears the >300 floor -- exactly the scenario the finding describes.
    // Under the old positional merge those 39 rows survived as a stale tail;
    // under a naive key-rebuild-from-fresh-alone they vanish instead.
    mockedRatesV2.getAll.mockResolvedValueOnce({
      crypto: [
        ...makeCoins('coingecko', 320),
        ...makeCoins('livecoinwatch', 2),
      ],
      fiat: makeFiat(25),
      errors: { cryptocompare: true },
    });
    serviceRefresher();
    await flush();

    const payload = captureRatesV2();
    expect(payload.crypto).toHaveLength(361); // 322 fresh + 39 carried
    const cryptocompareRows = payload.crypto.filter((c) => c.provider === 'cryptocompare');
    expect(cryptocompareRows).toHaveLength(39); // carried from cycle 1, not dropped
    expect(payload.errors?.cryptocompare).toBe(true); // still surfaced as an error
  });

  it('does not carry forward rows from a provider that is healthy this cycle, even if it shrank', async () => {
    // Cycle 1: coingecko returns 320 rows including one specific coin.
    mockedRatesV2.getAll.mockResolvedValueOnce({
      crypto: [
        { ...makeCoins('coingecko', 1)[0], id: 'delisted-coin' },
        ...makeCoins('coingecko', 319),
        ...makeCoins('cryptocompare', 39),
      ],
      fiat: makeFiat(25),
      errors: {},
    });
    serviceRefresher();
    await flush();

    // Cycle 2: coingecko succeeds again (no error) but legitimately no longer
    // returns 'delisted-coin' -- that coin should NOT be carried forward,
    // because coingecko did not error this cycle.
    mockedRatesV2.getAll.mockResolvedValueOnce({
      crypto: [
        ...makeCoins('coingecko', 319),
        ...makeCoins('cryptocompare', 39),
      ],
      fiat: makeFiat(25),
      errors: {},
    });
    serviceRefresher();
    await flush();

    const payload = captureRatesV2();
    expect(payload.crypto.find((c) => c.id === 'delisted-coin')).toBeUndefined();
    expect(payload.crypto).toHaveLength(358); // 319 + 39, no carry-forward
  });
});
