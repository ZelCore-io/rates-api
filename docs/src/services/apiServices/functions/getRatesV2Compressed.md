[**rates-api v3.0.0**](../../../../README.md) • **Docs**

***

[rates-api v3.0.0](../../../../modules.md) / [src/services/apiServices](../README.md) / getRatesV2Compressed

# Function: getRatesV2Compressed()

> **getRatesV2Compressed**(`req`, `res`): `Promise`\<`void`\>

Handles the GET request to retrieve compressed version of the exchange rates (version 2).

## Parameters

• **req**: `Request`\<`ParamsDictionary`, `any`, `any`, `ParsedQs`, `Record`\<`string`, `any`\>\>

The Express request object.

• **res**: `Response`\<`any`, `Record`\<`string`, `any`\>\>

The Express response object.

## Returns

`Promise`\<`void`\>

## Example

```typescript
app.get('/rates/v2/compressed', getRatesV2Compressed);
```

## Defined in

[src/services/apiServices.ts:85](https://github.com/ZelCore-io/rates-api/blob/6ee8192dea404fd0a0f6ba9b7352f3b7673523eb/src/services/apiServices.ts#L85)
