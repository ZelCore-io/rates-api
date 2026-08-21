[**rates-api v3.0.0**](../../../../README.md)

***

[rates-api](../../../../modules.md) / [src/lib/server](../README.md) / default

# Variable: default

> `const` **default**: `Express`

Defined in: [src/lib/server.ts:33](https://github.com/ZelCore-io/rates-api/blob/master/src/lib/server.ts#L33)

The main Express application instance.

## Remarks

This instance is configured with middleware and routes and is exported for use in the server.

## Example

```typescript
import app from './server';

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
```
