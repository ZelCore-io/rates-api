[**rates-api v3.0.0**](../../../../README.md) • **Docs**

***

[rates-api v3.0.0](../../../../modules.md) / [src/services/zelcoreRatesV2](../README.md) / getAll

# Function: getAll()

> **getAll**(): `Promise`\<[`PricesResponse`](../../../types/type-aliases/PricesResponse.md)\>

Fetches and aggregates cryptocurrency prices and fiat rates from multiple providers.

This function retrieves fiat rates from BitPay and cryptocurrency prices from CoinGecko,
CryptoCompare, and LiveCoinWatch. It handles errors from each provider and compiles the data
into a unified `PricesResponse` object.

## Returns

`Promise`\<[`PricesResponse`](../../../types/type-aliases/PricesResponse.md)\>

An object containing crypto prices, fiat rates, and any errors encountered.

## Async

## Example

```typescript
import zelcoreRatesV2 from './zelcoreRatesV2';

async function fetchPrices() {
  const prices = await zelcoreRatesV2.getAll();
  console.log('Prices:', prices);
}

fetchPrices();
```

## Defined in

[src/services/zelcoreRatesV2.ts:28](https://github.com/ZelCore-io/rates-api/blob/691ee3db71a277710156f53a41c1ecb57cce5d58/src/services/zelcoreRatesV2.ts#L28)
