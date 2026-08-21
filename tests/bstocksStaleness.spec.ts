import type { AxiosResponse } from 'axios';

/**
 * Staleness accounting across the provider/assembler seam.
 *
 * These tests drive the REAL Binance provider and mock only the HTTP layer.
 * tests/bstocks.spec.ts mocks the `Binance` class wholesale, which hides the
 * interaction pinned here: the provider backfills a symbol's last-known-good
 * ticker into the batch it returns, and the assembler cannot tell that from a
 * live quote unless it asks how old the price is.
 *
 * The scenario is a ticker-endpoint outage (Binance rate-limits the heavy
 * `/ticker` routes with a 418/429 long before `exchangeInfo` stops answering),
 * so the symbol keeps its TRADING status and stays in the assembler's
 * `tradable` set while nothing prices live.
 */

const DAY = 24 * 60 * 60 * 1000;

const axiosResponse = <T>(data: T): AxiosResponse<T> => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {} as AxiosResponse<T>['config'],
});

const TSLAB = { assetCode: 'TSLAB', assetName: 'Tesla (bStocks)', caList: [{ network: 'BSC', ca: '0x5b19' }] };

let tickersDown = false;

function route(url: string): Promise<AxiosResponse<unknown>> {
  if (url.includes('get-tokenised-asset')) return Promise.resolve(axiosResponse({ data: [TSLAB] }));
  if (url.includes('exchangeInfo')) {
    return Promise.resolve(axiosResponse({
      symbols: [
        { symbol: 'TSLABUSDT', status: 'TRADING' },
        { symbol: 'BTCUSDT', status: 'TRADING' },
      ],
    }));
  }
  if (tickersDown) return Promise.reject(new Error('418 rate limited'));
  if (url.includes('windowSize=7d')) {
    return Promise.resolve(axiosResponse([
      { symbol: 'TSLABUSDT', lastPrice: '326.11', priceChangePercent: '7.1', quoteVolume: '0' },
    ]));
  }
  return Promise.resolve(axiosResponse([
    { symbol: 'TSLABUSDT', lastPrice: '326.11', priceChangePercent: '2.5', quoteVolume: '1000000' },
    { symbol: 'BTCUSDT', lastPrice: '65222.00', priceChangePercent: '1.0', quoteVolume: '9' },
  ]));
}

/**
 * Both the Binance singleton's caches and the assembler's last-known-good map
 * are module-level state, so each test gets its own module registry.
 */
async function loadIsolated() {
  jest.resetModules();
  const { AxiosWrapper } = await import('../src/lib/axios');
  jest.spyOn(AxiosWrapper.prototype, 'get').mockImplementation(route as never);
  return import('../src/services/bstocks');
}

describe('bStocks staleness accounting', () => {
  beforeEach(() => {
    // `lru-cache` reads the clock from `performance.now`, which Jest's fake
    // timers leave alone; bridge it to the fake `Date` so the provider's 60s
    // quote cache and 1h universe cache expire as the test advances time.
    jest.useFakeTimers({ doNotFake: ['performance'] });
    jest.spyOn(performance, 'now').mockImplementation(() => Date.now());
    tickersDown = false;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('reports degraded when every symbol is served from the provider carry-forward', async () => {
    const { getBstockPrices, isBstocksDegraded } = await loadIsolated();

    await getBstockPrices();
    expect(isBstocksDegraded()).toBe(false);

    tickersDown = true;
    jest.advanceTimersByTime(10 * 60 * 1000);
    const prices = await getBstockPrices();

    // Still served -- that is what last-known-good is for ...
    expect(prices.map((p) => p.id)).toEqual(['bstock-tslab']);
    // ... but nothing priced live this run, so the outage has to be visible.
    expect(isBstocksDegraded()).toBe(true);
  });

  it('expires a carried price once it passes the staleness bound', async () => {
    const { getBstockPrices } = await loadIsolated();

    await getBstockPrices(); // priced live at 326.11

    tickersDown = true;
    jest.advanceTimersByTime(4 * DAY);
    await getBstockPrices(); // carried, four days stale -- must not reset the clock
    jest.advanceTimersByTime(4 * DAY);
    const prices = await getBstockPrices(); // eight days since the last live quote

    expect(prices).toEqual([]);
  });
});
