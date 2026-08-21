[**rates-api v3.0.0**](../../../../../README.md)

***

[rates-api](../../../../../modules.md) / [src/services/providers/cryptoCompare](../README.md) / CryptoCompare

# Class: CryptoCompare

Defined in: [src/services/providers/cryptoCompare.ts:40](https://github.com/ZelCore-io/rates-api/blob/master/src/services/providers/cryptoCompare.ts#L40)

Singleton class to interact with the CryptoCompare API.

This class provides methods to retrieve cryptocurrency exchange rates and market data from CryptoCompare.
It handles API requests, caching, and rate limiting.

## Example

```typescript
import { CryptoCompare } from './cryptocompare';

async function fetchExchangeRates() {
  const cryptoCompare = CryptoCompare.getInstance();
  const rates = await cryptoCompare.getExchangeRates(['BTC', 'ETH']);
  console.log('Exchange Rates:', rates);
}

fetchExchangeRates();
```

## Constructors

### Constructor

> **new CryptoCompare**(): `CryptoCompare`

Defined in: [src/services/providers/cryptoCompare.ts:96](https://github.com/ZelCore-io/rates-api/blob/master/src/services/providers/cryptoCompare.ts#L96)

Private constructor to enforce the singleton pattern.

Initializes the AxiosWrapper and the LRU cache.

#### Returns

`CryptoCompare`

#### Throws

If an instance already exists.

## Methods

### getExchangeRates()

> **getExchangeRates**(`ids`, `vsCurrency?`): `Promise`\<[`CryptoComparePrice`](../../../../types/type-aliases/CryptoComparePrice.md)\>

Defined in: [src/services/providers/cryptoCompare.ts:244](https://github.com/ZelCore-io/rates-api/blob/master/src/services/providers/cryptoCompare.ts#L244)

Retrieves exchange rates for an array of cryptocurrency symbols.

Handles splitting the symbols into batches to comply with API limitations.

#### Parameters

##### ids

`string`[]

An array of cryptocurrency symbols (e.g., ['BTC', 'ETH']).

##### vsCurrency?

`string` = `'BTC'`

The target currency symbol (default is 'BTC').

#### Returns

`Promise`\<[`CryptoComparePrice`](../../../../types/type-aliases/CryptoComparePrice.md)\>

An object mapping cryptocurrency symbols to their exchange rates.

#### Example

```typescript
const cryptoCompare = CryptoCompare.getInstance();
const rates = await cryptoCompare.getExchangeRates(['BTC', 'ETH'], 'USD');
console.log('Exchange Rates:', rates);
```

***

### getMarketData()

> **getMarketData**(`ids`, `vsCurrency?`): `Promise`\<[`CryptoCompareMarkets`](../../../../types/type-aliases/CryptoCompareMarkets.md)\>

Defined in: [src/services/providers/cryptoCompare.ts:317](https://github.com/ZelCore-io/rates-api/blob/master/src/services/providers/cryptoCompare.ts#L317)

Retrieves market data for an array of cryptocurrency symbols.

Handles splitting the symbols into batches to comply with API limitations.

#### Parameters

##### ids

`string`[]

An array of cryptocurrency symbols (e.g., ['BTC', 'ETH']).

##### vsCurrency?

`string` = `'BTC'`

Target currency symbol, or a comma-separated list of
them (e.g. `'BTC,USD'`) to get every quote in one request. The response
is keyed `[FROM][TO]`, so each symbol carries one entry per currency.

#### Returns

`Promise`\<[`CryptoCompareMarkets`](../../../../types/type-aliases/CryptoCompareMarkets.md)\>

An object containing detailed market data.

#### Throws

When the API reports an error, including an exhausted quota.

#### Example

```typescript
const cryptoCompare = CryptoCompare.getInstance();
const marketData = await cryptoCompare.getMarketData(['BTC', 'ETH'], 'USD');
console.log('Market Data:', marketData);
```

***

### getInstance()

> `static` **getInstance**(): `CryptoCompare`

Defined in: [src/services/providers/cryptoCompare.ts:119](https://github.com/ZelCore-io/rates-api/blob/master/src/services/providers/cryptoCompare.ts#L119)

Returns the singleton instance of the CryptoCompare class.

#### Returns

`CryptoCompare`

The singleton instance of CryptoCompare.

#### Example

```typescript
const cryptoCompare = CryptoCompare.getInstance();
```
