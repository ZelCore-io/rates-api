[**rates-api v3.0.0**](../../../../README.md) • **Docs**

***

[rates-api v3.0.0](../../../../modules.md) / [src/services/apiServices](../README.md) / checkContractsV2

# Function: checkContractsV2()

> **checkContractsV2**(`req`, `res`): `Promise`\<`void`\>

Handles the request to check for new contracts.

## Parameters

• **req**: `Request`\<`ParamsDictionary`, `any`, `any`, `ParsedQs`, `Record`\<`string`, `any`\>\>

The Express request object containing `contracts` in the body.

• **res**: `Response`\<`any`, `Record`\<`string`, `any`\>\>

The Express response object.

## Returns

`Promise`\<`void`\>

## Example

```typescript
app.post('/contracts/check', checkContractsV2);
```

## Defined in

[src/services/apiServices.ts:156](https://github.com/ZelCore-io/rates-api/blob/691ee3db71a277710156f53a41c1ecb57cce5d58/src/services/apiServices.ts#L156)
