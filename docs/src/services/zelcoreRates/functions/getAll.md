[**rates-api v3.0.0**](../../../../README.md) • **Docs**

***

[rates-api v3.0.0](../../../../modules.md) / [src/services/zelcoreRates](../README.md) / getAll

# Function: getAll()

> **getAll**(): `Promise`\<[`RatesData`](../../../types/type-aliases/RatesData.md)\>

Fetches exchange rates and price data from various providers and aggregates them.

This function retrieves fiat rates from BitPay and cryptocurrency prices from CoinGecko,
CryptoCompare, and LiveCoinWatch. It handles errors gracefully and returns an aggregated
`RatesData` object containing the data and any errors that occurred.

## Returns

`Promise`\<[`RatesData`](../../../types/type-aliases/RatesData.md)\>

The aggregated rates data.

## Async

## Example

```typescript
import { getAll } from './zelcoreRates';

async function fetchRates() {
  const rates = await getAll();
  console.log('Rates Data:', rates);
}

fetchRates();
```

## Defined in

[src/services/zelcoreRates.ts:34](https://github.com/ZelCore-io/rates-api/blob/691ee3db71a277710156f53a41c1ecb57cce5d58/src/services/zelcoreRates.ts#L34)
