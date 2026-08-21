[**rates-api v3.0.0**](../../../README.md)

***

[rates-api](../../../modules.md) / [src/routes](../README.md) / default

# Variable: default

> **default**: (`app`) => `void`

Defined in: [src/routes.ts:26](https://github.com/ZelCore-io/rates-api/blob/master/src/routes.ts#L26)

Configures the Express application by setting up routes, middleware, and caching.

## Parameters

### app

`Application`

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
