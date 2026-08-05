[**rates-api v3.0.0**](../../../../README.md)

***

[rates-api](../../../../modules.md) / [src/services/apiServices](../README.md) / getRatesV2

# Function: getRatesV2()

> **getRatesV2**(`req`, `res`): `Promise`\<`void`\>

Defined in: src/services/apiServices.ts:66

Handles the GET request to retrieve version 2 of the exchange rates.

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
app.get('/rates/v2', getRatesV2);
```
