[**rates-api v3.0.0**](../../../../README.md) • **Docs**

***

[rates-api v3.0.0](../../../../modules.md) / [src/services/apiServices](../README.md) / serviceRefresher

# Function: serviceRefresher()

> **serviceRefresher**(): `Promise`\<`void`\>

Periodically refreshes market data and exchange rates.

Fetches data from `zelcoreRates`, `zelcoreMarketsUSD`, and `zelcoreRatesV2`,
merges the fetched data with existing data, and handles errors.
Sets a delay before calling itself again.

## Returns

`Promise`\<`void`\>

## Example

```typescript
serviceRefresher();
```

## Defined in

[src/services/apiServices.ts:224](https://github.com/ZelCore-io/rates-api/blob/691ee3db71a277710156f53a41c1ecb57cce5d58/src/services/apiServices.ts#L224)
