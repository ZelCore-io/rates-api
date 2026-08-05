[**rates-api v3.0.0**](../../../../README.md)

***

[rates-api](../../../../modules.md) / [src/services/bstocks](../README.md) / getBstockPrices

# Function: getBstockPrices()

> **getBstockPrices**(): `Promise`\<[`CryptoPrice`](../../../types/type-aliases/CryptoPrice.md)[]\>

Defined in: src/services/bstocks.ts:44

Assembles the bStocks synthetic market: the intersection of Binance's
tokenised-asset universe (already filtered to BSC-listed assets by
`Binance.getTokenisedAssets`) with Spot symbols currently in `TRADING`
status, quoted in USDT.

BTC/USD conversion uses BTCUSDT fetched in the same 24h-ticker batch as the
bStock symbols, so both legs come from the same venue and no cross-venue
basis is introduced.

Emitted ids are `bstock-<assetCode lowercase>` under `provider: "coingecko"`
— NOT `"binance"`. The client does no prefix parsing: ZelCore's
`store/actions.js` (`applyMarkets`) keys the market store on the literal
string `${provider}-${id}`, and `use-fiat.js` builds the same literal from
`coininfo.json`'s `coingeckoID` as `coingecko-${coingeckoID}`. The sibling
`api` repo serves `coinInfo.coingeckoID = "bstock-<code>"`, so the two
literals only meet if the provider here is exactly `"coingecko"`. Any other
value makes the lookup miss silently — no error, just no price. This
id/provider pairing is a cross-repo contract; do not change it in isolation.

A module-level last-known-good map means a symbol that drops out of a given
refresh (CEX halt, e.g. around a stock split) keeps being served at its
previous price rather than disappearing from the response.

## Returns

`Promise`\<[`CryptoPrice`](../../../types/type-aliases/CryptoPrice.md)[]\>

One `CryptoPrice` per tradable bStock (BSC contract + TRADING
`<code>USDT` Spot symbol), including any carried over from a prior refresh.
