[**rates-api v3.0.0**](../../../../README.md) • **Docs**

***

[rates-api v3.0.0](../../../../modules.md) / [src/services/apiServices](../README.md) / getRatesV2

# Function: getRatesV2()

> **getRatesV2**(`req`, `res`): `Promise`\<`void`\>

Handles the GET request to retrieve version 2 of the exchange rates.

## Parameters

• **req**: `Request`\<`ParamsDictionary`, `any`, `any`, `ParsedQs`, `Record`\<`string`, `any`\>\>

The Express request object.

• **res**: `Response`\<`any`, `Record`\<`string`, `any`\>\>

The Express response object.

## Returns

`Promise`\<`void`\>

## Example

```typescript
app.get('/rates/v2', getRatesV2);
```

## Defined in

[src/services/apiServices.ts:66](https://github.com/ZelCore-io/rates-api/blob/691ee3db71a277710156f53a41c1ecb57cce5d58/src/services/apiServices.ts#L66)
