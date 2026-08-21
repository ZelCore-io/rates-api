import { Binance } from '../src/services/providers/binance';
import {
  getBstockPrices, getLastGoodBstockPrices, _clearLastGoodForTests, isBstocksDegraded,
} from '../src/services/bstocks';

jest.mock('../src/services/providers/binance');

const MockedBinance = Binance as jest.Mocked<typeof Binance>;

function mockBinance({ assets, trading, t24, t7d }: {
  assets: unknown[]; trading: string[]; t24: unknown[]; t7d: unknown[];
}) {
  // Every fixture here is a batch the provider priced live this round: these
  // tests hand back raw ticker arrays rather than exercising the provider's
  // last-known-good backfill, so a symbol in `t24` is by definition fresh and
  // anything else has never priced. The carried-price path -- where the
  // provider serves an old ticker that looks identical to a live one -- is
  // covered in bstocksStaleness.spec.ts against the real provider.
  const live = new Set((t24 as { symbol: string }[]).map((t) => t.symbol));
  MockedBinance.getInstance.mockReturnValue({
    getTokenisedAssets: jest.fn().mockResolvedValue(assets),
    getTradingSymbols: jest.fn().mockResolvedValue(new Set(trading)),
    getTicker24h: jest.fn().mockResolvedValue(t24),
    getTicker7d: jest.fn().mockResolvedValue(t7d),
    lastGoodAgeMs: jest.fn((symbol: string) => (live.has(symbol) ? 0 : null)),
    pricedFresh: jest.fn((symbol: string) => live.has(symbol)),
  } as never);
}

const TSLAB = { assetCode: 'TSLAB', assetName: 'Tesla', caList: [{ network: 'BSC', ca: '0x5b19' }] };

describe('bStocks assembler', () => {
  beforeEach(() => _clearLastGoodForTests());

  it('emits coingecko-provider entries with BTC and USD rates', async () => {
    mockBinance({
      assets: [TSLAB],
      trading: ['TSLABUSDT', 'BTCUSDT'],
      t24: [
        { symbol: 'TSLABUSDT', lastPrice: '326.11', priceChangePercent: '2.5', quoteVolume: '1000000' },
        { symbol: 'BTCUSDT', lastPrice: '65222.00', priceChangePercent: '1.0', quoteVolume: '9' },
      ],
      t7d: [{ symbol: 'TSLABUSDT', lastPrice: '326.11', priceChangePercent: '7.1', quoteVolume: '0' }],
    });
    const prices = await getBstockPrices();
    expect(prices).toHaveLength(1);
    expect(prices[0].id).toBe('bstock-tslab');
    expect(prices[0].provider).toBe('coingecko');
    expect(prices[0].rates.usd).toBeCloseTo(326.11);
    expect(prices[0].rates.btc).toBeCloseTo(326.11 / 65222);
    expect(prices[0].change24h).toBeCloseTo(2.5);
    expect(prices[0].change7d).toBeCloseTo(7.1);
    // rank must be OMITTED (like CryptoCompare's rows elsewhere in this repo),
    // not zeroed -- a literal `rank: 0` would sort every bStock ahead of
    // Bitcoin in any ascending rank-ordered wallet list.
    expect(prices[0].rank).toBeUndefined();
  });

  it('skips assets without a TRADING symbol', async () => {
    mockBinance({ assets: [TSLAB], trading: ['BTCUSDT'], t24: [
      { symbol: 'BTCUSDT', lastPrice: '65222.00', priceChangePercent: '1.0', quoteVolume: '9' },
    ], t7d: [] });
    expect(await getBstockPrices()).toHaveLength(0);
  });

  it('serves last-known-good when a symbol disappears (CEX halt)', async () => {
    mockBinance({
      assets: [TSLAB], trading: ['TSLABUSDT', 'BTCUSDT'],
      t24: [
        { symbol: 'TSLABUSDT', lastPrice: '326.11', priceChangePercent: '2.5', quoteVolume: '1000000' },
        { symbol: 'BTCUSDT', lastPrice: '65222.00', priceChangePercent: '1.0', quoteVolume: '9' },
      ],
      t7d: [],
    });
    await getBstockPrices();
    // Halt: ticker omits TSLABUSDT this round
    mockBinance({ assets: [TSLAB], trading: ['TSLABUSDT', 'BTCUSDT'], t24: [
      { symbol: 'BTCUSDT', lastPrice: '65000.00', priceChangePercent: '0.5', quoteVolume: '9' },
    ], t7d: [] });
    const prices = await getBstockPrices();
    expect(prices).toHaveLength(1);
    expect(prices[0].rates.usd).toBeCloseTo(326.11);
  });

  // The BTC divisor is the one place an unusable upstream value can turn into
  // Infinity/NaN in an emitted rate. A near-identical zero-divisor bug reached
  // a transaction-signing path in the sibling `api` repo, so pin both shapes.
  it('emits nothing rather than Infinity when BTCUSDT is missing from the batch', async () => {
    mockBinance({
      assets: [TSLAB],
      trading: ['TSLABUSDT', 'BTCUSDT'],
      t24: [{ symbol: 'TSLABUSDT', lastPrice: '326.11', priceChangePercent: '2.5', quoteVolume: '1000000' }],
      t7d: [{ symbol: 'TSLABUSDT', lastPrice: '326.11', priceChangePercent: '7.1', quoteVolume: '0' }],
    });
    expect(await getBstockPrices()).toHaveLength(0);
  });

  it('emits nothing rather than Infinity when BTCUSDT is priced at zero', async () => {
    mockBinance({
      assets: [TSLAB],
      trading: ['TSLABUSDT', 'BTCUSDT'],
      t24: [
        { symbol: 'TSLABUSDT', lastPrice: '326.11', priceChangePercent: '2.5', quoteVolume: '1000000' },
        { symbol: 'BTCUSDT', lastPrice: '0.00000000', priceChangePercent: '0', quoteVolume: '0' },
      ],
      t7d: [{ symbol: 'TSLABUSDT', lastPrice: '326.11', priceChangePercent: '7.1', quoteVolume: '0' }],
    });
    expect(await getBstockPrices()).toHaveLength(0);
  });

  it('isolates a bad ticker to its own asset, leaving siblings in the batch priced', async () => {
    const NVDAB = { assetCode: 'NVDAB', assetName: 'Nvidia', caList: [{ network: 'BSC', ca: '0xabcd' }] };
    mockBinance({
      assets: [TSLAB, NVDAB],
      trading: ['TSLABUSDT', 'NVDABUSDT', 'BTCUSDT'],
      t24: [
        // TSLAB halted (present, zeroed); NVDAB healthy.
        { symbol: 'TSLABUSDT', lastPrice: '0.00000000', priceChangePercent: '0', quoteVolume: '0' },
        { symbol: 'NVDABUSDT', lastPrice: '120.00', priceChangePercent: '3.0', quoteVolume: '2000' },
        { symbol: 'BTCUSDT', lastPrice: '65222.00', priceChangePercent: '1.0', quoteVolume: '9' },
      ],
      t7d: [{ symbol: 'NVDABUSDT', lastPrice: '120.00', priceChangePercent: '4.0', quoteVolume: '0' }],
    });
    const prices = await getBstockPrices();
    expect(prices.map((p) => p.id)).toEqual(['bstock-nvdab']);
    expect(prices[0].rates.usd).toBeCloseTo(120);
  });

  it('emits nothing at all when the feature is disabled', async () => {
    const config = await import('../config');
    const original = config.default.bStocksEnabled;
    config.default.bStocksEnabled = false;
    try {
      mockBinance({
        assets: [TSLAB], trading: ['TSLABUSDT', 'BTCUSDT'], t24: [], t7d: [],
      });
      expect(await getBstockPrices()).toHaveLength(0);
    } finally {
      config.default.bStocksEnabled = original;
    }
  });

  // Finding 3: a total Binance outage must be observable (not reported as a
  // healthy service quietly serving frozen prices forever), and getBstockPrices
  // must never reject even when every underlying Binance call fails -- every
  // failure inside getTokenisedAssets/getTradingSymbols/getTicker24h/getTicker7d
  // is already caught internally (see binance.ts), so a total outage looks
  // like `{assets: [], trading: new Set(), t24: [], t7d: []}` from here.
  it('marks the service degraded without throwing when a total outage prices nothing fresh, while still serving last-known-good within the staleness bound', async () => {
    mockBinance({
      assets: [TSLAB],
      trading: ['TSLABUSDT', 'BTCUSDT'],
      t24: [
        { symbol: 'TSLABUSDT', lastPrice: '326.11', priceChangePercent: '2.5', quoteVolume: '1000000' },
        { symbol: 'BTCUSDT', lastPrice: '65222.00', priceChangePercent: '1.0', quoteVolume: '9' },
      ],
      t7d: [{ symbol: 'TSLABUSDT', lastPrice: '326.11', priceChangePercent: '7.1', quoteVolume: '0' }],
    });
    await getBstockPrices();
    expect(isBstocksDegraded()).toBe(false);

    // Total outage: every Binance call resolves the way the real client does
    // after internally catching a network failure -- empty, never rejecting.
    mockBinance({
      assets: [], trading: [], t24: [], t7d: [],
    });
    await expect(getBstockPrices()).resolves.toHaveLength(1); // stale TSLAB still served
    expect(isBstocksDegraded()).toBe(true);
  });

  it('drops a last-known-good entry once it exceeds the configured staleness bound, rather than serving it forever', async () => {
    const config = (await import('../config')).default;
    const dateSpy = jest.spyOn(Date, 'now');
    try {
      dateSpy.mockReturnValue(1_000_000);
      mockBinance({
        assets: [TSLAB],
        trading: ['TSLABUSDT', 'BTCUSDT'],
        t24: [
          { symbol: 'TSLABUSDT', lastPrice: '326.11', priceChangePercent: '2.5', quoteVolume: '1000000' },
          { symbol: 'BTCUSDT', lastPrice: '65222.00', priceChangePercent: '1.0', quoteVolume: '9' },
        ],
        t7d: [{ symbol: 'TSLABUSDT', lastPrice: '326.11', priceChangePercent: '7.1', quoteVolume: '0' }],
      });
      await getBstockPrices();

      // Still well within the bound: kept.
      dateSpy.mockReturnValue(1_000_000 + config.bstocksLastGoodMaxAgeMs - 1);
      mockBinance({
        assets: [], trading: [], t24: [], t7d: [],
      });
      expect(await getBstockPrices()).toHaveLength(1);

      // Past the bound: a total outage no longer serves the ancient price.
      dateSpy.mockReturnValue(1_000_000 + config.bstocksLastGoodMaxAgeMs + 1);
      mockBinance({
        assets: [], trading: [], t24: [], t7d: [],
      });
      expect(await getBstockPrices()).toHaveLength(0);
    } finally {
      dateSpy.mockRestore();
    }
  });

  // Finding 7: the cross-repo id/provider contract (see the module doc) was
  // only pinned against a single asset. Assert it holds as a property across
  // a multi-asset fixture.
  it('holds the coingecko-provider / bstock-<code> id contract across a multi-asset fixture', async () => {
    const codes = ['TSLAB', 'NVDAB', 'MSTRB', 'GOOGLB', 'AMZNB'];
    const assets = codes.map((code) => ({
      assetCode: code, assetName: code, caList: [{ network: 'BSC', ca: '0xabc' }],
    }));
    const trading = [...codes.map((c) => `${c}USDT`), 'BTCUSDT'];
    const t24 = [
      ...codes.map((code, i) => ({
        symbol: `${code}USDT`, lastPrice: `${100 + i}`, priceChangePercent: '1.0', quoteVolume: '1000',
      })),
      { symbol: 'BTCUSDT', lastPrice: '65222.00', priceChangePercent: '1.0', quoteVolume: '9' },
    ];
    const t7d = codes.map((code) => ({
      symbol: `${code}USDT`, lastPrice: '100', priceChangePercent: '2.0', quoteVolume: '1000',
    }));
    mockBinance({
      assets, trading, t24, t7d,
    });

    const prices = await getBstockPrices();
    expect(prices).toHaveLength(codes.length);
    prices.forEach((p) => {
      expect(p.provider).toBe('coingecko');
      expect(p.id).toMatch(/^bstock-[a-z0-9]+$/);
    });
  });
});

describe('bStocks degradation signalling and last-good snapshot', () => {
  beforeEach(() => _clearLastGoodForTests());

  // Regression guard: the 10s race in zelcoreRatesV2 used to resolve to [] on
  // timeout. bStock rows carry provider "coingecko" but their failure is
  // reported under errors.binance, so apiServices' provider carry-forward can
  // never protect them -- every bStock would vanish from /v2/rates while the
  // wallet showed $0 with no banner. The snapshot below is what the timeout
  // branch serves instead.
  it('exposes a last-good snapshot without touching Binance', async () => {
    mockBinance({
      assets: [TSLAB],
      trading: ['TSLABUSDT', 'BTCUSDT'],
      t24: [
        { symbol: 'TSLABUSDT', lastPrice: '326.11', priceChangePercent: '2.5', quoteVolume: '1000000' },
        { symbol: 'BTCUSDT', lastPrice: '65222.00', priceChangePercent: '1.0', quoteVolume: '9' },
      ],
      t7d: [{ symbol: 'TSLABUSDT', lastPrice: '326.11', priceChangePercent: '7.1', quoteVolume: '0' }],
    });
    await getBstockPrices();

    const snapshot = getLastGoodBstockPrices();
    expect(snapshot).toHaveLength(1);
    expect(snapshot[0].id).toBe('bstock-tslab');
    expect(snapshot[0].provider).toBe('coingecko');
    expect(snapshot[0].rates.usd).toBeCloseTo(326.11);
  });

  it('reports degraded on a cold start with no last-good data at all', async () => {
    // A fresh deploy while Binance is down has nothing cached. Requiring
    // lastGood to be non-empty would report a healthy service serving zero
    // bStocks -- silent, and exactly when someone needs to know.
    mockBinance({
      assets: [], trading: [], t24: [], t7d: [],
    });
    expect(await getBstockPrices()).toHaveLength(0);
    expect(isBstocksDegraded()).toBe(true);
  });
});
