[**rates-api v3.0.0**](../../../../README.md)

***

[rates-api](../../../../modules.md) / [src/services/zelcoreRates](../README.md) / default

# Variable: default

> **default**: `object`

Defined in: src/services/zelcoreRates.ts:153

## Type Declaration

### getAll

> **getAll**: () => `Promise`\<[`RatesData`](../../../types/type-aliases/RatesData.md)\>

Fetches exchange rates and price data from various providers and aggregates them.

This function retrieves fiat rates from BitPay and cryptocurrency prices from CoinGecko,
CryptoCompare, and LiveCoinWatch. It handles errors gracefully and returns an aggregated
`RatesData` object containing the data and any errors that occurred.

#### Returns

`Promise`\<[`RatesData`](../../../types/type-aliases/RatesData.md)\>

The aggregated rates data.

#### Async

#### Example

```typescript
import { getAll } from './zelcoreRates';

async function fetchRates() {
  const rates = await getAll();
  console.log('Rates Data:', rates);
}

fetchRates();
```
