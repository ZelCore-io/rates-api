[**rates-api v3.0.0**](../../../../../README.md)

***

[rates-api](../../../../../modules.md) / [src/services/providers/binance](../README.md) / Binance

# Class: Binance

Defined in: [src/services/providers/binance.ts:38](https://github.com/ZelCore-io/rates-api/blob/master/src/services/providers/binance.ts#L38)

Singleton class to interact with Binance's public (no-API-key) endpoints.

Provides the tokenised-asset universe (bStocks with a BSC contract) and Spot
24h/7d tickers, quoted in USDT. Mirrors `CoinGecko`'s shape: an `AxiosWrapper`
per base URL, an `LRUCache` per refresh cadence, and defensive error handling
that never lets a single failed refresh drop a symbol that was previously
known good (e.g. during a CEX trading halt around a stock split).

## Example

```typescript
import { Binance } from './binance';

async function fetchBStocks() {
  const binance = Binance.getInstance();
  const assets = await binance.getTokenisedAssets();
  const trading = await binance.getTradingSymbols();
  const tickers = await binance.getTicker24h([...trading]);
  console.log(tickers);
}
```

## Constructors

### Constructor

> **new Binance**(): `Binance`

#### Returns

`Binance`

## Methods

### chunkSymbols()

> **chunkSymbols**(`symbols`): `string`[][]

Defined in: [src/services/providers/binance.ts:137](https://github.com/ZelCore-io/rates-api/blob/master/src/services/providers/binance.ts#L137)

Splits a symbol list into chunks of at most `TICKER_CHUNK` symbols, to stay
under Binance's per-request weight cap on the 7d rolling-window ticker.

#### Parameters

##### symbols

`string`[]

The full symbol list to split.

#### Returns

`string`[][]

An array of symbol chunks.

***

### filterBscAssets()

> **filterBscAssets**(`assets`): [`BinanceTokenisedAsset`](../../../../types/type-aliases/BinanceTokenisedAsset.md)[]

Defined in: [src/services/providers/binance.ts:124](https://github.com/ZelCore-io/rates-api/blob/master/src/services/providers/binance.ts#L124)

Filters tokenised assets down to those with a BSC (BNB Smart Chain) contract listed.

#### Parameters

##### assets

[`BinanceTokenisedAsset`](../../../../types/type-aliases/BinanceTokenisedAsset.md)[]

The raw tokenised-asset list from Binance.

#### Returns

[`BinanceTokenisedAsset`](../../../../types/type-aliases/BinanceTokenisedAsset.md)[]

Only the assets with at least one BSC entry in `caList`.

***

### getTicker24h()

> **getTicker24h**(`symbols`): `Promise`\<[`BinanceTicker`](../../../../types/type-aliases/BinanceTicker.md)[]\>

Defined in: [src/services/providers/binance.ts:291](https://github.com/ZelCore-io/rates-api/blob/master/src/services/providers/binance.ts#L291)

Retrieves 24h tickers for the given symbols in a single request.

On a failed or partial refresh, missing symbols are backfilled from the
last-known-good store rather than dropped. Cached for 60 seconds per
requested symbol set.

#### Parameters

##### symbols

`string`[]

The Spot symbols to fetch (e.g. `TSLABUSDT`).

#### Returns

`Promise`\<[`BinanceTicker`](../../../../types/type-aliases/BinanceTicker.md)[]\>

One ticker per requested symbol that has ever been seen.

***

### getTicker7d()

> **getTicker7d**(`symbols`): `Promise`\<[`BinanceTicker`](../../../../types/type-aliases/BinanceTicker.md)[]\>

Defined in: [src/services/providers/binance.ts:321](https://github.com/ZelCore-io/rates-api/blob/master/src/services/providers/binance.ts#L321)

Retrieves 7d rolling-window tickers for the given symbols, chunked to stay
under Binance's per-request weight cap.

Each chunk is fetched independently, so one failing chunk never drops the
symbols in the others; any symbol whose chunk failed (or that was omitted,
e.g. a halt) is backfilled from the last-known-good store. Cached for 60
seconds per requested symbol set.

#### Parameters

##### symbols

`string`[]

The Spot symbols to fetch (e.g. `TSLABUSDT`).

#### Returns

`Promise`\<[`BinanceTicker`](../../../../types/type-aliases/BinanceTicker.md)[]\>

One ticker per requested symbol that has ever been seen.

***

### getTokenisedAssets()

> **getTokenisedAssets**(): `Promise`\<[`BinanceTokenisedAsset`](../../../../types/type-aliases/BinanceTokenisedAsset.md)[]\>

Defined in: [src/services/providers/binance.ts:226](https://github.com/ZelCore-io/rates-api/blob/master/src/services/providers/binance.ts#L226)

Retrieves the tokenised-asset universe (bStocks), filtered to those with a BSC contract.

Cached for 1 hour.

#### Returns

`Promise`\<[`BinanceTokenisedAsset`](../../../../types/type-aliases/BinanceTokenisedAsset.md)[]\>

The BSC-listed tokenised assets.

***

### getTradingSymbols()

> **getTradingSymbols**(): `Promise`\<`Set`\<`string`\>\>

Defined in: [src/services/providers/binance.ts:258](https://github.com/ZelCore-io/rates-api/blob/master/src/services/providers/binance.ts#L258)

Retrieves the set of Spot symbols currently in `TRADING` status.

A symbol dropping to `BREAK` (as happens during trading halts, e.g. around
a stock split) simply falls out of this set on the next refresh; callers
should keep serving the last-known-good ticker for it rather than treating
its absence here as "delisted".

Cached for 1 hour.

#### Returns

`Promise`\<`Set`\<`string`\>\>

The set of currently-trading symbols.

***

### lastGoodAgeMs()

> **lastGoodAgeMs**(`symbol`, `window?`): `number` \| `null`

Defined in: [src/services/providers/binance.ts:186](https://github.com/ZelCore-io/rates-api/blob/master/src/services/providers/binance.ts#L186)

Age in milliseconds of the last-known-good price for a symbol, or null if
none has ever been recorded for the requested window(s). Lets a caller
distinguish a live price from one carried through a long halt, which the
ticker itself cannot express.

#### Parameters

##### symbol

`string`

The Binance symbol, e.g. `TSLABUSDT`.

##### window?

`"7d"` \| `"24h"`

Which window's last-known-good entry to check (`24h` or
`7d`). Omit to get the freshest of the two — the age of whichever window
priced most recently — which is what a caller asking "how stale is this
symbol overall" generally wants.

#### Returns

`number` \| `null`

Age in ms, or null when the symbol has never priced successfully
for the requested window (or for either window, when unspecified).

***

### pricedFresh()

> **pricedFresh**(`symbol`, `window`): `boolean`

Defined in: [src/services/providers/binance.ts:214](https://github.com/ZelCore-io/rates-api/blob/master/src/services/providers/binance.ts#L214)

Whether the price currently served for a symbol comes from a live quote
rather than the last-known-good backfill.

`mergeTickers` returns a plain `BinanceTicker` whether it was fetched or
carried, so a caller cannot tell the two apart from the returned value —
and a carried price is a valid, positive number, which makes the
difference invisible to any price check. A batch answered from
`quoteCache` legitimately carries a price up to one cache TTL old, so
anything within that window is live; past it, nothing has priced the
symbol since, so every batch in between was backfilled.

#### Parameters

##### symbol

`string`

The Binance symbol, e.g. `TSLABUSDT`.

##### window

`"7d"` \| `"24h"`

Which ticker window to check (`24h` or `7d`).

#### Returns

`boolean`

True when the symbol priced live within the quote-cache window.

***

### getInstance()

> `static` **getInstance**(): `Binance`

Defined in: [src/services/providers/binance.ts:112](https://github.com/ZelCore-io/rates-api/blob/master/src/services/providers/binance.ts#L112)

Returns the singleton instance of the Binance class.

#### Returns

`Binance`

The singleton instance of Binance.
