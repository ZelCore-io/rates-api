[**rates-api v3.0.0**](../../../../README.md) • **Docs**

***

[rates-api v3.0.0](../../../../modules.md) / [src/services/apiServices](../README.md) / default

# Variable: default

> **default**: `object`

## Type declaration

### checkContractsV2()

> **checkContractsV2**: (`req`, `res`) => `Promise`\<`void`\>

Handles the request to check for new contracts.

#### Parameters

• **req**: `Request`\<`ParamsDictionary`, `any`, `any`, `ParsedQs`, `Record`\<`string`, `any`\>\>

The Express request object containing `contracts` in the body.

• **res**: `Response`\<`any`, `Record`\<`string`, `any`\>\>

The Express response object.

#### Returns

`Promise`\<`void`\>

#### Example

```typescript
app.post('/contracts/check', checkContractsV2);
```

### dataRefresher()

> **dataRefresher**: () => `Promise`\<`void`\>

Periodically refreshes coin information and aggregator IDs.

This function logs the start of the refresh process, calls `getLatestCoinInfo`,
and sets a timeout to call itself again after 1 hour. If an error occurs, it
logs the error and retries after 30 minutes.

#### Returns

`Promise`\<`void`\>

#### Example

```typescript
dataRefresher();
```

### getData()

> **getData**: () => `object`

Retrieves the current rates and market data.

#### Returns

`object`

An object containing `rates` and `marketsUSD`.

##### marketsUSD

> **marketsUSD**: [`MarketsData`](../../../types/type-aliases/MarketsData.md)

##### rates

> **rates**: [`RatesData`](../../../types/type-aliases/RatesData.md)

#### Example

```typescript
const data = getData();
console.log(data.rates, data.marketsUSD);
```

### getFoundContracts()

> **getFoundContracts**: () => [`FoundContractStore`](../../../types/type-aliases/FoundContractStore.md)

Retrieves the found contracts.

#### Returns

[`FoundContractStore`](../../../types/type-aliases/FoundContractStore.md)

The `foundContracts` object.

#### Example

```typescript
const contracts = getFoundContracts();
```

### getMarketsUsd()

> **getMarketsUsd**: (`req`, `res`) => `Promise`\<`void`\>

Handles the GET request to retrieve market data in USD.

#### Parameters

• **req**: `Request`\<`ParamsDictionary`, `any`, `any`, `ParsedQs`, `Record`\<`string`, `any`\>\>

The Express request object.

• **res**: `Response`\<`any`, `Record`\<`string`, `any`\>\>

The Express response object.

#### Returns

`Promise`\<`void`\>

#### Example

```typescript
app.get('/markets/usd', getMarketsUsd);
```

### getRates()

> **getRates**: (`req`, `res`) => `Promise`\<`void`\>

Handles the GET request to retrieve exchange rates.

#### Parameters

• **req**: `Request`\<`ParamsDictionary`, `any`, `any`, `ParsedQs`, `Record`\<`string`, `any`\>\>

The Express request object.

• **res**: `Response`\<`any`, `Record`\<`string`, `any`\>\>

The Express response object.

#### Returns

`Promise`\<`void`\>

#### Example

```typescript
app.get('/rates', getRates);
```

### getRatesV2()

> **getRatesV2**: (`req`, `res`) => `Promise`\<`void`\>

Handles the GET request to retrieve version 2 of the exchange rates.

#### Parameters

• **req**: `Request`\<`ParamsDictionary`, `any`, `any`, `ParsedQs`, `Record`\<`string`, `any`\>\>

The Express request object.

• **res**: `Response`\<`any`, `Record`\<`string`, `any`\>\>

The Express response object.

#### Returns

`Promise`\<`void`\>

#### Example

```typescript
app.get('/rates/v2', getRatesV2);
```

### getRatesV2Compressed()

> **getRatesV2Compressed**: (`req`, `res`) => `Promise`\<`void`\>

Handles the GET request to retrieve compressed version of the exchange rates (version 2).

#### Parameters

• **req**: `Request`\<`ParamsDictionary`, `any`, `any`, `ParsedQs`, `Record`\<`string`, `any`\>\>

The Express request object.

• **res**: `Response`\<`any`, `Record`\<`string`, `any`\>\>

The Express response object.

#### Returns

`Promise`\<`void`\>

#### Example

```typescript
app.get('/rates/v2/compressed', getRatesV2Compressed);
```

### serviceRefresher()

> **serviceRefresher**: () => `Promise`\<`void`\>

Periodically refreshes market data and exchange rates.

Fetches data from `zelcoreRates`, `zelcoreMarketsUSD`, and `zelcoreRatesV2`,
merges the fetched data with existing data, and handles errors.
Sets a delay before calling itself again.

#### Returns

`Promise`\<`void`\>

#### Example

```typescript
serviceRefresher();
```

## Defined in

[src/services/apiServices.ts:263](https://github.com/ZelCore-io/rates-api/blob/6685e3f3773638f4d641af3eec276ce5ce2b0d4c/src/services/apiServices.ts#L263)
