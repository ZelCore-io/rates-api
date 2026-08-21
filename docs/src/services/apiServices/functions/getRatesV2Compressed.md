[**rates-api v3.0.0**](../../../../README.md)

***

[rates-api](../../../../modules.md) / [src/services/apiServices](../README.md) / getRatesV2Compressed

# Function: getRatesV2Compressed()

> **getRatesV2Compressed**(`req`, `res`): `Promise`\<`void`\>

Defined in: [src/services/apiServices.ts:85](https://github.com/ZelCore-io/rates-api/blob/master/src/services/apiServices.ts#L85)

Handles the GET request to retrieve compressed version of the exchange rates (version 2).

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
app.get('/rates/v2/compressed', getRatesV2Compressed);
```
