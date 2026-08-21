[**rates-api v3.0.0**](../../../../../README.md)

***

[rates-api](../../../../../modules.md) / [src/services/providers/liveCoinWatch](../README.md) / LiveCoinWatch

# Class: LiveCoinWatch

Defined in: [src/services/providers/liveCoinWatch.ts:28](https://github.com/ZelCore-io/rates-api/blob/master/src/services/providers/liveCoinWatch.ts#L28)

Singleton class to interact with the LiveCoinWatch API.

This class provides methods to retrieve cryptocurrency exchange rates from LiveCoinWatch.
It handles API requests, caching, and rate limiting.

## Example

```typescript
import { LiveCoinWatch } from './livecoinwatch';

async function fetchExchangeRates() {
  const liveCoinWatch = LiveCoinWatch.getInstance();
  const rates = await liveCoinWatch.getExchangeRates(['BTC', 'ETH'], 'USD');
  console.log('Exchange Rates:', rates);
}

fetchExchangeRates();
```

## Constructors

### Constructor

> **new LiveCoinWatch**(): `LiveCoinWatch`

Defined in: [src/services/providers/liveCoinWatch.ts:69](https://github.com/ZelCore-io/rates-api/blob/master/src/services/providers/liveCoinWatch.ts#L69)

Private constructor to enforce the singleton pattern.

Initializes the AxiosWrapper and the LRU cache.

#### Returns

`LiveCoinWatch`

#### Throws

If an instance already exists.

## Methods

### getExchangeRates()

> **getExchangeRates**(`ids`, `vsCurrency?`): `Promise`\<[`LiveCoinWatchMarket`](../../../../types/type-aliases/LiveCoinWatchMarket.md)[]\>

Defined in: [src/services/providers/liveCoinWatch.ts:164](https://github.com/ZelCore-io/rates-api/blob/master/src/services/providers/liveCoinWatch.ts#L164)

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

`Promise`\<[`LiveCoinWatchMarket`](../../../../types/type-aliases/LiveCoinWatchMarket.md)[]\>

An array of `LiveCoinWatchMarket` objects containing exchange rate information.

#### Example

```typescript
const liveCoinWatch = LiveCoinWatch.getInstance();
const rates = await liveCoinWatch.getExchangeRates(['BTC', 'ETH'], 'USD');
console.log('Exchange Rates:', rates);
```

***

### getInstance()

> `static` **getInstance**(): `LiveCoinWatch`

Defined in: [src/services/providers/liveCoinWatch.ts:92](https://github.com/ZelCore-io/rates-api/blob/master/src/services/providers/liveCoinWatch.ts#L92)

Returns the singleton instance of the LiveCoinWatch class.

#### Returns

`LiveCoinWatch`

The singleton instance of LiveCoinWatch.

#### Example

```typescript
const liveCoinWatch = LiveCoinWatch.getInstance();
```
