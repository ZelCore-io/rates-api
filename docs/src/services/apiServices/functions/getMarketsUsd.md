[**rates-api v3.0.0**](../../../../README.md) • **Docs**

***

[rates-api v3.0.0](../../../../modules.md) / [src/services/apiServices](../README.md) / getMarketsUsd

# Function: getMarketsUsd()

> **getMarketsUsd**(`req`, `res`): `Promise`\<`void`\>

Handles the GET request to retrieve market data in USD.

## Parameters

• **req**: `Request`\<`ParamsDictionary`, `any`, `any`, `ParsedQs`, `Record`\<`string`, `any`\>\>

The Express request object.

• **res**: `Response`\<`any`, `Record`\<`string`, `any`\>\>

The Express response object.

## Returns

`Promise`\<`void`\>

## Example

```typescript
app.get('/markets/usd', getMarketsUsd);
```

## Defined in

[src/services/apiServices.ts:123](https://github.com/ZelCore-io/rates-api/blob/6685e3f3773638f4d641af3eec276ce5ce2b0d4c/src/services/apiServices.ts#L123)
