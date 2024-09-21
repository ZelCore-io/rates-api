[**rates-api v3.0.0**](../../../../README.md) • **Docs**

***

[rates-api v3.0.0](../../../../modules.md) / [src/services/zelcoreRates](../README.md) / default

# Variable: default

> **default**: `object`

## Type declaration

### getAll()

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

## Defined in

[src/services/zelcoreRates.ts:151](https://github.com/ZelCore-io/rates-api/blob/6ee8192dea404fd0a0f6ba9b7352f3b7673523eb/src/services/zelcoreRates.ts#L151)
