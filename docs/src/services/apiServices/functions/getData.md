[**rates-api v3.0.0**](../../../../README.md) • **Docs**

***

[rates-api v3.0.0](../../../../modules.md) / [src/services/apiServices](../README.md) / getData

# Function: getData()

> **getData**(): `object`

Retrieves the current rates and market data.

## Returns

`object`

An object containing `rates` and `marketsUSD`.

### marketsUSD

> **marketsUSD**: [`MarketsData`](../../../types/type-aliases/MarketsData.md)

### rates

> **rates**: [`RatesData`](../../../types/type-aliases/RatesData.md)

## Example

```typescript
const data = getData();
console.log(data.rates, data.marketsUSD);
```

## Defined in

[src/services/apiServices.ts:105](https://github.com/ZelCore-io/rates-api/blob/691ee3db71a277710156f53a41c1ecb57cce5d58/src/services/apiServices.ts#L105)
