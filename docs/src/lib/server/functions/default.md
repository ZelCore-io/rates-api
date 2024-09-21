[**rates-api v3.0.0**](../../../../README.md) • **Docs**

***

[rates-api v3.0.0](../../../../modules.md) / [src/lib/server](../README.md) / default

# Function: default()

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

## default(req, res)

> **default**(`req`, `res`): `any`

Express instance itself is a request handler, which could be invoked without
third argument.

### Parameters

• **req**: `IncomingMessage` \| `Request`\<`ParamsDictionary`, `any`, `any`, `ParsedQs`, `Record`\<`string`, `any`\>\>

• **res**: `ServerResponse`\<`IncomingMessage`\> \| `Response`\<`any`, `Record`\<`string`, `any`\>, `number`\>

### Returns

`any`

### Remarks

This instance is configured with middleware and routes and is exported for use in the server.

### Example

```typescript
import app from './server';

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
```

### Defined in

[src/lib/server.ts:32](https://github.com/ZelCore-io/rates-api/blob/6ee8192dea404fd0a0f6ba9b7352f3b7673523eb/src/lib/server.ts#L32)

## default(req, res, next)

> **default**(`req`, `res`, `next`): `void`

The main Express application instance.

### Parameters

• **req**: `Request`\<`ParamsDictionary`, `any`, `any`, `ParsedQs`, `Record`\<`string`, `any`\>\>

• **res**: `Response`\<`any`, `Record`\<`string`, `any`\>, `number`\>

• **next**: `NextFunction`

### Returns

`void`

### Remarks

This instance is configured with middleware and routes and is exported for use in the server.

### Example

```typescript
import app from './server';

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
```

### Defined in

[src/lib/server.ts:32](https://github.com/ZelCore-io/rates-api/blob/6ee8192dea404fd0a0f6ba9b7352f3b7673523eb/src/lib/server.ts#L32)
