[**rates-api v3.0.0**](../../../../README.md)

***

[rates-api](../../../../modules.md) / [src/lib/axios](../README.md) / AxiosWrapper

# Class: AxiosWrapper

Defined in: src/lib/axios.ts:26

A wrapper around Axios to handle automatic retries and customizable configurations.

This class provides a simplified interface over Axios, adding automatic retry functionality
for failed requests, and allowing customization of retry logic and request timeouts.

## Example

```typescript
import AxiosWrapper from './AxiosWrapper';

const apiClient = new AxiosWrapper('https://api.example.com', 5, 10000);

// Performing a GET request
apiClient.get('/users')
  .then(response => console.log(response.data))
  .catch(error => console.error(error));

// Performing a POST request
apiClient.post('/users', { name: 'John Doe' })
  .then(response => console.log(response.data))
  .catch(error => console.error(error));
```

## Constructors

### Constructor

> **new AxiosWrapper**(`baseURL`, `maxRetries?`, `timeout?`): `AxiosWrapper`

Defined in: src/lib/axios.ts:43

Creates an instance of AxiosWrapper.

#### Parameters

##### baseURL

`string`

The base URL for all requests.

##### maxRetries?

`number` = `3`

The maximum number of retry attempts for failed requests (default is 3).

##### timeout?

`number` = `5000`

The timeout in milliseconds for requests (default is 5000 ms).

#### Returns

`AxiosWrapper`

#### Example

```typescript
const apiClient = new AxiosWrapper('https://api.example.com', 5, 10000);
```

## Methods

### delete()

> **delete**(`url`, `config?`): `Promise`\<`AxiosResponse`\<`any`, `any`\>\>

Defined in: src/lib/axios.ts:171

Performs a DELETE request.

#### Parameters

##### url

`string`

The URL to send the DELETE request to.

##### config?

`AxiosRequestConfig`\<`any`\>

Optional Axios request configuration.

#### Returns

`Promise`\<`AxiosResponse`\<`any`, `any`\>\>

The response from the DELETE request.

#### Example

```typescript
apiClient.delete('/users/123')
  .then(response => console.log(response.data))
  .catch(error => console.error(error));
```

***

### get()

> **get**(`url`, `config?`): `Promise`\<`AxiosResponse`\<`any`, `any`\>\>

Defined in: src/lib/axios.ts:115

Performs a GET request.

#### Parameters

##### url

`string`

The URL to send the GET request to.

##### config?

`AxiosRequestConfig`\<`any`\>

Optional Axios request configuration.

#### Returns

`Promise`\<`AxiosResponse`\<`any`, `any`\>\>

The response from the GET request.

#### Example

```typescript
apiClient.get('/users')
  .then(response => console.log(response.data))
  .catch(error => console.error(error));
```

***

### post()

> **post**(`url`, `data?`, `config?`): `Promise`\<`AxiosResponse`\<`any`, `any`\>\>

Defined in: src/lib/axios.ts:134

Performs a POST request.

#### Parameters

##### url

`string`

The URL to send the POST request to.

##### data?

`any`

The data to send with the POST request.

##### config?

`AxiosRequestConfig`\<`any`\>

Optional Axios request configuration.

#### Returns

`Promise`\<`AxiosResponse`\<`any`, `any`\>\>

The response from the POST request.

#### Example

```typescript
apiClient.post('/users', { name: 'John Doe' })
  .then(response => console.log(response.data))
  .catch(error => console.error(error));
```

***

### put()

> **put**(`url`, `data?`, `config?`): `Promise`\<`AxiosResponse`\<`any`, `any`\>\>

Defined in: src/lib/axios.ts:153

Performs a PUT request.

#### Parameters

##### url

`string`

The URL to send the PUT request to.

##### data?

`any`

The data to send with the PUT request.

##### config?

`AxiosRequestConfig`\<`any`\>

Optional Axios request configuration.

#### Returns

`Promise`\<`AxiosResponse`\<`any`, `any`\>\>

The response from the PUT request.

#### Example

```typescript
apiClient.put('/users/123', { name: 'Jane Doe' })
  .then(response => console.log(response.data))
  .catch(error => console.error(error));
```
