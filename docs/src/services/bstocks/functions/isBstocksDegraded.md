[**rates-api v3.0.0**](../../../../README.md)

***

[rates-api](../../../../modules.md) / [src/services/bstocks](../README.md) / isBstocksDegraded

# Function: isBstocksDegraded()

> **isBstocksDegraded**(): `boolean`

Defined in: [src/services/bstocks.ts:40](https://github.com/ZelCore-io/rates-api/blob/master/src/services/bstocks.ts#L40)

True when the most recent `getBstockPrices()` call priced nothing fresh —
every underlying Binance call failed, returned unusable data, or served
only prices carried over from an earlier refresh. Distinguishes "Binance is
down and we're serving frozen prices" from a normal, healthy refresh, which
`getBstockPrices()`'s return value alone cannot express since it never
rejects and unconditionally re-emits `lastGood` either way.

## Returns

`boolean`

Whether the bStocks pipeline is currently degraded.
