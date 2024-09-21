[**rates-api v3.0.0**](../../../../README.md) • **Docs**

***

[rates-api v3.0.0](../../../../modules.md) / [src/services/zelcoreMarketsUSD](../README.md) / default

# Variable: default

> **default**: `object`

## Type declaration

### getAll()

> **getAll**: () => `Promise`\<[`MarketsData`](../../../types/type-aliases/MarketsData.md)\>

Fetches market data from multiple providers and aggregates it.

This function retrieves market data from CryptoCompare, CoinGecko, and LiveCoinWatch,
processes it, and returns an aggregated `MarketsData` object.

#### Returns

`Promise`\<[`MarketsData`](../../../types/type-aliases/MarketsData.md)\>

The aggregated market data.

#### Async

#### Example

```typescript
const marketData = await getAll();
console.log(marketData);
```

## Defined in

[src/services/zelcoreMarketsUSD.ts:137](https://github.com/ZelCore-io/rates-api/blob/691ee3db71a277710156f53a41c1ecb57cce5d58/src/services/zelcoreMarketsUSD.ts#L137)
