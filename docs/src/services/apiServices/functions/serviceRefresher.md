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

[src/services/apiServices.ts:224](https://github.com/ZelCore-io/rates-api/blob/6685e3f3773638f4d641af3eec276ce5ce2b0d4c/src/services/apiServices.ts#L224)
