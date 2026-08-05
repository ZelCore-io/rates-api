[**rates-api v3.0.0**](../../../../README.md)

***

[rates-api](../../../../modules.md) / [src/services/apiServices](../README.md) / dataRefresher

# Function: dataRefresher()

> **dataRefresher**(): `Promise`\<`void`\>

Defined in: src/services/apiServices.ts:195

Periodically refreshes coin information and aggregator IDs.

This function logs the start of the refresh process, calls `getLatestCoinInfo`,
and sets a timeout to call itself again after 1 hour. If an error occurs, it
logs the error and retries after 30 minutes.

## Returns

`Promise`\<`void`\>

## Example

```typescript
dataRefresher();
```
