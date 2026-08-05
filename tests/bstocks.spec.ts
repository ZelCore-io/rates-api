import { Binance } from '../src/services/providers/binance';
import { getBstockPrices, _clearLastGoodForTests } from '../src/services/bstocks';

jest.mock('../src/services/providers/binance');

const MockedBinance = Binance as jest.Mocked<typeof Binance>;

function mockBinance({ assets, trading, t24, t7d }: {
  assets: unknown[]; trading: string[]; t24: unknown[]; t7d: unknown[];
}) {
  MockedBinance.getInstance.mockReturnValue({
    getTokenisedAssets: jest.fn().mockResolvedValue(assets),
    getTradingSymbols: jest.fn().mockResolvedValue(new Set(trading)),
    getTicker24h: jest.fn().mockResolvedValue(t24),
    getTicker7d: jest.fn().mockResolvedValue(t7d),
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
});
