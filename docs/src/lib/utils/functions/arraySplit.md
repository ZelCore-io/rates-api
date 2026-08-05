[**rates-api v3.0.0**](../../../../README.md)

***

[rates-api](../../../../modules.md) / [src/lib/utils](../README.md) / arraySplit

# Function: arraySplit()

> **arraySplit**(`arr`, `size`): `string`[][]

Defined in: src/lib/utils.ts:15

Splits an array into chunks of a specified size.

## Parameters

### arr

`string`[]

The array to split.

### size

`number`

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
