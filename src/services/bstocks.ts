import config from '../../config';
import { Binance } from './providers/binance';
import type { CryptoPrice } from '../types';

// Last-known-good per bStock id, with the epoch-ms timestamp it was accepted
// at. During a CEX halt (stock splits) Binance returns the symbol PRESENT
// with lastPrice "0.00000000" rather than omitting it — measured live, 20/20
// halted symbols came back present, 9 priced zero — so the guard below is on
// the price being finite and positive, not on the ticker being absent. We
// keep serving the previous price (display-only per the bStocks partner
// guide) until it exceeds `config.bstocksLastGoodMaxAgeMs`.
let lastGood = new Map<string, { price: CryptoPrice; at: number }>();

// How many symbols were priced FRESH (not carried from last-known-good) on
// the most recent call to getBstockPrices(). Every failure inside this
// module's Binance calls is caught internally (see the Binance class docs),
// so Promise.all never rejects and a total outage would otherwise look
// identical to a healthy refresh from the outside. isBstocksDegraded() below
// exposes that distinction so a caller can surface it (e.g. errors.binance).
let freshPricedLastRun = 0;

export function _clearLastGoodForTests(): void {
  lastGood = new Map();
  freshPricedLastRun = 0;
}

/**
 * True when the most recent `getBstockPrices()` call priced nothing fresh
 * (every underlying Binance call failed or returned unusable data) while
 * there is still last-known-good data being served. Distinguishes "Binance is
 * down and we're serving frozen prices" from a normal, healthy refresh, which
 * `getBstockPrices()`'s return value alone cannot express since it never
 * rejects and unconditionally re-emits `lastGood` either way.
 *
 * @returns Whether the bStocks pipeline is currently degraded.
 */
export function isBstocksDegraded(): boolean {
  return freshPricedLastRun === 0 && lastGood.size > 0;
}

/**
 * Assembles the bStocks synthetic market: the intersection of Binance's
 * tokenised-asset universe (already filtered to BSC-listed assets by
 * `Binance.getTokenisedAssets`) with Spot symbols currently in `TRADING`
 * status, quoted in USDT.
 *
 * BTC/USD conversion uses BTCUSDT fetched in the same 24h-ticker batch as the
 * bStock symbols, so both legs come from the same venue and no cross-venue
 * basis is introduced.
 *
 * Emitted ids are `bstock-<assetCode lowercase>` under `provider: "coingecko"`
 * — NOT `"binance"`. The client does no prefix parsing: ZelCore's
 * `store/actions.js` (`applyMarkets`) keys the market store on the literal
 * string `${provider}-${id}`, and `use-fiat.js` builds the same literal from
 * `coininfo.json`'s `coingeckoID` as `coingecko-${coingeckoID}`. The sibling
 * `api` repo serves `coinInfo.coingeckoID = "bstock-<code>"`, so the two
 * literals only meet if the provider here is exactly `"coingecko"`. Any other
 * value makes the lookup miss silently — no error, just no price. This
 * id/provider pairing is a cross-repo contract; do not change it in isolation.
 *
 * `rank` is intentionally omitted (not zeroed) to match CryptoCompare's rows
 * elsewhere in this repo, which also carry no `rank`: a literal `rank: 0`
 * would sort every bStock ahead of Bitcoin in any ascending rank-ordered list.
 *
 * A module-level last-known-good map means a symbol that drops out of a given
 * refresh (CEX halt, e.g. around a stock split) keeps being served at its
 * previous price rather than disappearing from the response, bounded by
 * `config.bstocksLastGoodMaxAgeMs` (see the halting comment on `lastGood`
 * above) so a permanently-delisted symbol doesn't get served forever.
 *
 * @returns One `CryptoPrice` per tradable bStock (BSC contract + TRADING
 * `<code>USDT` Spot symbol) still within the staleness bound, including any
 * carried over from a prior refresh.
 */
export async function getBstockPrices(): Promise<CryptoPrice[]> {
  if (!config.bStocksEnabled) return [];
  const binance = Binance.getInstance();
  const [assets, trading] = await Promise.all([
    binance.getTokenisedAssets(),
    binance.getTradingSymbols(),
  ]);
  const tradable = assets.filter((a) => trading.has(`${a.assetCode}USDT`));
  const symbols = tradable.map((a) => `${a.assetCode}USDT`);
  const withBtc = symbols.includes('BTCUSDT') ? symbols : [...symbols, 'BTCUSDT'];
  const [t24, t7d] = await Promise.all([
    binance.getTicker24h(withBtc),
    binance.getTicker7d(symbols),
  ]);
  const t24Map = new Map(t24.map((t) => [t.symbol, t]));
  const t7dMap = new Map(t7d.map((t) => [t.symbol, t]));
  const btcUsd = Number(t24Map.get('BTCUSDT')?.lastPrice);

  const now = Date.now();
  let freshCount = 0;
  tradable.forEach((asset) => {
    const id = `bstock-${asset.assetCode.toLowerCase()}`;
    const ticker = t24Map.get(`${asset.assetCode}USDT`);
    const px = Number(ticker?.lastPrice);
    if (!ticker || !Number.isFinite(px) || px <= 0 || !Number.isFinite(btcUsd) || btcUsd <= 0) {
      return; // keep lastGood entry as-is
    }
    freshCount += 1;
    lastGood.set(id, {
      at: now,
      price: {
        id,
        provider: 'coingecko',
        rates: { btc: px / btcUsd, usd: px },
        supply: 0,
        volume: Number(ticker.quoteVolume) || 0,
        change24h: Number(ticker.priceChangePercent) || 0,
        market: 0,
        total_supply: 0,
        change7d: Number(t7dMap.get(`${asset.assetCode}USDT`)?.priceChangePercent) || 0,
      },
    });
  });
  freshPricedLastRun = freshCount;

  // Bound the staleness: drop any entry that hasn't priced fresh within the
  // configured window rather than serving it forever.
  lastGood.forEach((entry, id) => {
    if (now - entry.at > config.bstocksLastGoodMaxAgeMs) {
      lastGood.delete(id);
    }
  });

  return Array.from(lastGood.values()).map((entry) => entry.price);
}
