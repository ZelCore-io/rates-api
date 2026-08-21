[**rates-api v3.0.0**](../../../../README.md)

***

[rates-api](../../../../modules.md) / [src/services/bstocks](../README.md) / getLastGoodBstockPrices

# Function: getLastGoodBstockPrices()

> **getLastGoodBstockPrices**(): [`CryptoPrice`](../../../types/type-aliases/CryptoPrice.md)[]

Defined in: [src/services/bstocks.ts:60](https://github.com/ZelCore-io/rates-api/blob/master/src/services/bstocks.ts#L60)

The current last-known-good rows, without touching Binance.

Used when a caller has given up waiting on `getBstockPrices()`. Returning
an empty array there would drop every bStock from the response while the
provider-level carry-forward in apiServices cannot help: bStock rows carry
`provider: 'coingecko'` but their failure is reported under
`errors.binance`, so nothing would carry them.

## Returns

[`CryptoPrice`](../../../types/type-aliases/CryptoPrice.md)[]

The last-known-good rows, stale entries already pruned.
