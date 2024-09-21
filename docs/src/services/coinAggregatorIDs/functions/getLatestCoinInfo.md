[**rates-api v3.0.0**](../../../../README.md) • **Docs**

***

[rates-api v3.0.0](../../../../modules.md) / [src/services/coinAggregatorIDs](../README.md) / getLatestCoinInfo

# Function: getLatestCoinInfo()

> **getLatestCoinInfo**(): `Promise`\<`void`\>

Fetches the latest coin information and updates the global data.

This function retrieves coin information from a specified URL, updates the CoinGecko IDs,
and populates the contract map with CoinGecko tokens.

## Returns

`Promise`\<`void`\>

A promise that resolves when the operation is complete.

## Async

## Example

```typescript
await getLatestCoinInfo();
console.log(zelData.coinInfo);
```

## Defined in

[src/services/coinAggregatorIDs.ts:92](https://github.com/ZelCore-io/rates-api/blob/691ee3db71a277710156f53a41c1ecb57cce5d58/src/services/coinAggregatorIDs.ts#L92)
