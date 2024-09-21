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

[src/routes.ts:26](https://github.com/ZelCore-io/rates-api/blob/6ee8192dea404fd0a0f6ba9b7352f3b7673523eb/src/routes.ts#L26)
