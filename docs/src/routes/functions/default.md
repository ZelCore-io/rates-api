[**rates-api v3.0.0**](../../../README.md) • **Docs**

***

[rates-api v3.0.0](../../../modules.md) / [src/routes](../README.md) / default

# Function: default()

> **default**(`app`): `void`

Configures the Express application by setting up routes, middleware, and caching.

## Parameters

• **app**: `Application`

The Express application instance.

## Returns

`void`

## Example

```typescript
import express from 'express';
import configureApp from './app';

const app = express();
configureApp(app);

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
```

## Defined in

[src/routes.ts:26](https://github.com/ZelCore-io/rates-api/blob/6685e3f3773638f4d641af3eec276ce5ce2b0d4c/src/routes.ts#L26)
