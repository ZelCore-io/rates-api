[**rates-api v3.0.0**](../../../../README.md) • **Docs**

***

[rates-api v3.0.0](../../../../modules.md) / [src/services/zelcoreMarketsUSD](../README.md) / getAll

# Function: getAll()

> **getAll**(): `Promise`\<[`MarketsData`](../../../types/type-aliases/MarketsData.md)\>

Fetches market data from multiple providers and aggregates it.

This function retrieves market data from CryptoCompare, CoinGecko, and LiveCoinWatch,
processes it, and returns an aggregated `MarketsData` object.

## Returns

`Promise`\<[`MarketsData`](../../../types/type-aliases/MarketsData.md)\>

The aggregated market data.

## Async

## Example

```typescript
const marketData = await getAll();
console.log(marketData);
```

## Defined in

[src/services/zelcoreMarketsUSD.ts:21](https://github.com/ZelCore-io/rates-api/blob/6685e3f3773638f4d641af3eec276ce5ce2b0d4c/src/services/zelcoreMarketsUSD.ts#L21)
