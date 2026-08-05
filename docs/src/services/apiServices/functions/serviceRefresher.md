[**rates-api v3.0.0**](../../../../README.md)

***

[rates-api](../../../../modules.md) / [src/services/apiServices](../README.md) / serviceRefresher

# Function: serviceRefresher()

> **serviceRefresher**(): `Promise`\<`void`\>

Defined in: src/services/apiServices.ts:224

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
