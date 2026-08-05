[**rates-api v3.0.0**](../../../../../README.md)

***

[rates-api](../../../../../modules.md) / [src/services/providers/binance](../README.md) / Binance

# Class: Binance

Defined in: src/services/providers/binance.ts:33

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

Defined in: src/services/providers/binance.ts:122

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

Defined in: src/services/providers/binance.ts:110

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

Defined in: src/services/providers/binance.ts:231

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

Defined in: src/services/providers/binance.ts:261

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

Defined in: src/services/providers/binance.ts:173

Retrieves the tokenised-asset universe (bStocks), filtered to those with a BSC contract.

Cached for 1 hour.

#### Returns

`Promise`\<[`BinanceTokenisedAsset`](../../../../types/type-aliases/BinanceTokenisedAsset.md)[]\>

The BSC-listed tokenised assets.

***

### getTradingSymbols()

> **getTradingSymbols**(): `Promise`\<`Set`\<`string`\>\>

Defined in: src/services/providers/binance.ts:201

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

> **lastGoodAgeMs**(`symbol`): `number` \| `null`

Defined in: src/services/providers/binance.ts:161

Age in milliseconds of the last-known-good price for a symbol, or null if
none has ever been recorded. Lets a caller distinguish a live price from
one carried through a long halt, which the ticker itself cannot express.

#### Parameters

##### symbol

`string`

The Binance symbol, e.g. `TSLABUSDT`.

#### Returns

`number` \| `null`

Age in ms, or null when the symbol has never priced successfully.

***

### getInstance()

> `static` **getInstance**(): `Binance`

Defined in: src/services/providers/binance.ts:99

Returns the singleton instance of the Binance class.

#### Returns

`Binance`

The singleton instance of Binance.
