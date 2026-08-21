[**rates-api v3.0.0**](../../../../README.md)

***

[rates-api](../../../../modules.md) / [src/services/apiServices](../README.md) / checkContractsV2

# Function: checkContractsV2()

> **checkContractsV2**(`req`, `res`): `Promise`\<`void`\>

Defined in: [src/services/apiServices.ts:156](https://github.com/ZelCore-io/rates-api/blob/master/src/services/apiServices.ts#L156)

Handles the request to check for new contracts.

## Parameters

### req

`Request`

The Express request object containing `contracts` in the body.

### res

`Response`

The Express response object.

## Returns

`Promise`\<`void`\>

## Example

```typescript
app.post('/contracts/check', checkContractsV2);
```
