[**rates-api v3.0.0**](../../../../../README.md) • **Docs**

***

[rates-api v3.0.0](../../../../../modules.md) / [src/services/providers/cryptoCompare](../README.md) / CryptoCompare

# Class: CryptoCompare

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

### new CryptoCompare()

> **new CryptoCompare**(): [`CryptoCompare`](CryptoCompare.md)

Private constructor to enforce the singleton pattern.

Initializes the AxiosWrapper and the LRU cache.

#### Returns

[`CryptoCompare`](CryptoCompare.md)

#### Throws

If an instance already exists.

#### Defined in

[src/services/providers/cryptoCompare.ts:69](https://github.com/ZelCore-io/rates-api/blob/691ee3db71a277710156f53a41c1ecb57cce5d58/src/services/providers/cryptoCompare.ts#L69)

## Methods

### getExchangeRates()

> **getExchangeRates**(`ids`, `vsCurrency`): `Promise`\<[`CryptoComparePrice`](../../../../types/type-aliases/CryptoComparePrice.md)\>

Retrieves exchange rates for an array of cryptocurrency symbols.

Handles splitting the symbols into batches to comply with API limitations.

#### Parameters

• **ids**: `string`[]

An array of cryptocurrency symbols (e.g., ['BTC', 'ETH']).

• **vsCurrency**: `string` = `'BTC'`

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

#### Defined in

[src/services/providers/cryptoCompare.ts:163](https://github.com/ZelCore-io/rates-api/blob/691ee3db71a277710156f53a41c1ecb57cce5d58/src/services/providers/cryptoCompare.ts#L163)

***

### getMarketData()

> **getMarketData**(`ids`, `vsCurrency`): `Promise`\<[`CryptoCompareMarkets`](../../../../types/type-aliases/CryptoCompareMarkets.md)\>

Retrieves market data for an array of cryptocurrency symbols.

Handles splitting the symbols into batches to comply with API limitations.

#### Parameters

• **ids**: `string`[]

An array of cryptocurrency symbols (e.g., ['BTC', 'ETH']).

• **vsCurrency**: `string` = `'BTC'`

The target currency symbol (default is 'BTC').

#### Returns

`Promise`\<[`CryptoCompareMarkets`](../../../../types/type-aliases/CryptoCompareMarkets.md)\>

An object containing detailed market data.

#### Example

```typescript
const cryptoCompare = CryptoCompare.getInstance();
const marketData = await cryptoCompare.getMarketData(['BTC', 'ETH'], 'USD');
console.log('Market Data:', marketData);
```

#### Defined in

[src/services/providers/cryptoCompare.ts:226](https://github.com/ZelCore-io/rates-api/blob/691ee3db71a277710156f53a41c1ecb57cce5d58/src/services/providers/cryptoCompare.ts#L226)

***

### getInstance()

> `static` **getInstance**(): [`CryptoCompare`](CryptoCompare.md)

Returns the singleton instance of the CryptoCompare class.

#### Returns

[`CryptoCompare`](CryptoCompare.md)

The singleton instance of CryptoCompare.

#### Example

```typescript
const cryptoCompare = CryptoCompare.getInstance();
```

#### Defined in

[src/services/providers/cryptoCompare.ts:92](https://github.com/ZelCore-io/rates-api/blob/691ee3db71a277710156f53a41c1ecb57cce5d58/src/services/providers/cryptoCompare.ts#L92)
