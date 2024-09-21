[**rates-api v3.0.0**](../../../../README.md) • **Docs**

***

[rates-api v3.0.0](../../../../modules.md) / [src/lib/utils](../README.md) / arraySplit

# Function: arraySplit()

> **arraySplit**(`arr`, `size`): `string`[][]

Splits an array into chunks of a specified size.

## Parameters

• **arr**: `string`[]

The array to split.

• **size**: `number`

The maximum size of each chunk.

## Returns

`string`[][]

An array of arrays, where each subarray has at most `size` elements.

## Example

```typescript
const array = ['a', 'b', 'c', 'd', 'e'];
const chunks = arraySplit(array, 2);
// chunks: [['a', 'b'], ['c', 'd'], ['e']]
```

## Defined in

[src/lib/utils.ts:15](https://github.com/ZelCore-io/rates-api/blob/691ee3db71a277710156f53a41c1ecb57cce5d58/src/lib/utils.ts#L15)
