[**rates-api v3.0.0**](../../../../README.md) • **Docs**

***

[rates-api v3.0.0](../../../../modules.md) / [src/lib/utils](../README.md) / makeRequestStrings

# Function: makeRequestStrings()

> **makeRequestStrings**(`elements`, `maxLength`): `string`[]

Combines elements of a string array into comma-separated strings, ensuring that each combined string does not exceed a specified maximum length.

This function iterates over the input `elements` and concatenates them with commas.
If adding another element would exceed the `maxLength`, it pushes the current string to the result array and starts a new one.

## Parameters

• **elements**: `string`[]

The array of strings to combine.

• **maxLength**: `number`

The maximum length of each combined string.

## Returns

`string`[]

An array of combined strings.

## Example

```typescript
const elements = ['apple', 'banana', 'cherry', 'date', 'fig'];
const maxLength = 15;
const result = makeRequestStrings(elements, maxLength);
// result: ['apple,banana', 'cherry,date', 'fig']
```

## Defined in

[src/lib/utils.ts:41](https://github.com/ZelCore-io/rates-api/blob/6685e3f3773638f4d641af3eec276ce5ce2b0d4c/src/lib/utils.ts#L41)
