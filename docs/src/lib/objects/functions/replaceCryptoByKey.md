[**rates-api v3.0.0**](../../../../README.md)

***

[rates-api](../../../../modules.md) / [src/lib/objects](../README.md) / replaceCryptoByKey

# Function: replaceCryptoByKey()

> **replaceCryptoByKey**\<`T`\>(`source`): `T`[]

Defined in: src/lib/objects.ts:74

Rebuilds the crypto array from `source` alone, de-duplicated by
`${provider}-${id}`, preserving source order with last-write-wins.

This deliberately does NOT merge with the previous array — hence the name.
The positional `mergeDeep` it replaced overlaid the new array onto the old
one index by index, which is only correct while every provider block returns
exactly the same number of rows in the same order. When a block shrank (a
provider outage, a delisted coin), two things went wrong: fields from the
old entry at that index survived onto a different coin — a CryptoCompare row
inheriting CoinGecko's `rank` and `change7d` — and entries past the new
length lived on as stale duplicates. Because the ZelCore client re-keys on
`${provider}-${id}` with last-write-wins, and the stale duplicates sat after
the fresh ones, wallet users were served the STALE price on any cycle where
a block's row count shifted.

Two behaviour changes a caller should know about:
 - entries repeating the same `provider`+`id` collapse to one, keeping the
   last value at the first occurrence's position;
 - an entry the fetch no longer produces disappears immediately, rather than
   persisting from the previous cycle.

## Type Parameters

### T

`T` *extends* `object`

## Parameters

### source

`T`[]

The freshly fetched entries.

## Returns

`T`[]

The de-duplicated entries, in source order.
