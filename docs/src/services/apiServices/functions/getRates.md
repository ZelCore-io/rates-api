[**rates-api v3.0.0**](../../../../README.md)

***

[rates-api](../../../../modules.md) / [src/services/apiServices](../README.md) / getRates

# Function: getRates()

> **getRates**(`req`, `res`): `Promise`\<`void`\>

Defined in: src/services/apiServices.ts:47

Handles the GET request to retrieve exchange rates.

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
app.get('/rates', getRates);
```
