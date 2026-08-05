[**rates-api v3.0.0**](../../../../README.md)

***

[rates-api](../../../../modules.md) / [src/services/apiServices](../README.md) / getMarketsUsd

# Function: getMarketsUsd()

> **getMarketsUsd**(`req`, `res`): `Promise`\<`void`\>

Defined in: src/services/apiServices.ts:123

Handles the GET request to retrieve market data in USD.

## Parameters

### req

`Request`

The Express request object.

### res

`Response`

The Express response object.

## Returns

`Promise`\<`void`\>

## Example

```typescript
app.get('/markets/usd', getMarketsUsd);
```
