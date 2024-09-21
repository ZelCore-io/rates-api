[**rates-api v3.0.0**](../../../../README.md) • **Docs**

***

[rates-api v3.0.0](../../../../modules.md) / [src/services/apiServices](../README.md) / dataRefresher

# Function: dataRefresher()

> **dataRefresher**(): `Promise`\<`void`\>

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

## Defined in

[src/services/apiServices.ts:195](https://github.com/ZelCore-io/rates-api/blob/6ee8192dea404fd0a0f6ba9b7352f3b7673523eb/src/services/apiServices.ts#L195)
