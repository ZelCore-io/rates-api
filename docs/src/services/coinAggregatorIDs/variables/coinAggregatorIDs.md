[**rates-api v3.0.0**](../../../../README.md) • **Docs**

***

[rates-api v3.0.0](../../../../modules.md) / [src/services/coinAggregatorIDs](../README.md) / coinAggregatorIDs

# Variable: coinAggregatorIDs

> `const` **coinAggregatorIDs**: `object`

An object containing arrays of cryptocurrency IDs used by different data aggregators.

## Type declaration

### coingecko

> **coingecko**: `string`[]

CoinGecko API IDs.

Found under the 'Info' column and part of the URL, e.g., https://www.coingecko.com/en/coins/[API-ID].
Add to the end of the list.

### cryptoCompare

> **cryptoCompare**: `string`[]

CryptoCompare API IDs.

Add the CryptoCompare IDs at the end of this list.

### livecoinwatch

> **livecoinwatch**: `string`[]

LiveCoinWatch API IDs.

## Const

## Defined in

[src/services/coinAggregatorIDs.ts:14](https://github.com/ZelCore-io/rates-api/blob/691ee3db71a277710156f53a41c1ecb57cce5d58/src/services/coinAggregatorIDs.ts#L14)
