[**rates-api v3.0.0**](../../../../README.md)

***

[rates-api](../../../../modules.md) / [src/services/apiServices](../README.md) / getData

# Function: getData()

> **getData**(): `object`

Defined in: [src/services/apiServices.ts:105](https://github.com/ZelCore-io/rates-api/blob/master/src/services/apiServices.ts#L105)

Retrieves the current rates and market data.

## Returns

An object containing `rates` and `marketsUSD`.

### marketsUSD

> **marketsUSD**: [`MarketsData`](../../../types/type-aliases/MarketsData.md)

Stores market data in USD.

Structure:
- `marketsUSD[0]`: BTC to USD market data.
- `marketsUSD[1]`: Errors object.

### rates

> **rates**: [`RatesData`](../../../types/type-aliases/RatesData.md)

Stores exchange rates data.

Structure:
- `rates[0]`: BTC to fiat exchange rates.
- `rates[1]`: Alternative coins to fiat exchange rates.
- `rates[2]`: Errors object.

## Example

```typescript
const data = getData();
console.log(data.rates, data.marketsUSD);
```
