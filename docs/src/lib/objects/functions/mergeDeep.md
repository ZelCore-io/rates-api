[**rates-api v3.0.0**](../../../../README.md) • **Docs**

***

[rates-api v3.0.0](../../../../modules.md) / [src/lib/objects](../README.md) / mergeDeep

# Function: mergeDeep()

> **mergeDeep**(`target`, `source`): `any`

Deeply merges two objects or arrays.

This function takes a target and a source and recursively merges properties.
- For arrays, it merges each item recursively.
- For objects, it merges each key recursively.

## Parameters

• **target**: `any`

The target object or array to merge into.

• **source**: `any`

The source object or array to merge from.

## Returns

`any`

The merged object or array.

## Example

```typescript
const obj1 = { a: 1, b: { c: 2 } };
const obj2 = { b: { d: 3 }, e: 4 };
const result = mergeDeep(obj1, obj2);
// result: { a: 1, b: { c: 2, d: 3 }, e: 4 }
```

## Defined in

[src/lib/objects.ts:20](https://github.com/ZelCore-io/rates-api/blob/691ee3db71a277710156f53a41c1ecb57cce5d58/src/lib/objects.ts#L20)
