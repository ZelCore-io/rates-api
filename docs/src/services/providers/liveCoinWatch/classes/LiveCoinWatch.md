[**rates-api v3.0.0**](../../../../../README.md) • **Docs**

***

[rates-api v3.0.0](../../../../../modules.md) / [src/services/providers/liveCoinWatch](../README.md) / LiveCoinWatch

# Class: LiveCoinWatch

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

### new LiveCoinWatch()

> **new LiveCoinWatch**(): [`LiveCoinWatch`](LiveCoinWatch.md)

Private constructor to enforce the singleton pattern.

Initializes the AxiosWrapper and the LRU cache.

#### Returns

[`LiveCoinWatch`](LiveCoinWatch.md)

#### Throws

If an instance already exists.

#### Defined in

[src/services/providers/liveCoinWatch.ts:69](https://github.com/ZelCore-io/rates-api/blob/6685e3f3773638f4d641af3eec276ce5ce2b0d4c/src/services/providers/liveCoinWatch.ts#L69)

## Methods

### getExchangeRates()

> **getExchangeRates**(`ids`, `vsCurrency`): `Promise`\<[`LiveCoinWatchMarket`](../../../../types/type-aliases/LiveCoinWatchMarket.md)[]\>

Retrieves exchange rates for an array of cryptocurrency symbols.

Handles splitting the symbols into batches to comply with API limitations.

#### Parameters

• **ids**: `string`[]

An array of cryptocurrency symbols (e.g., ['BTC', 'ETH']).

• **vsCurrency**: `string` = `'BTC'`

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

#### Defined in

[src/services/providers/liveCoinWatch.ts:164](https://github.com/ZelCore-io/rates-api/blob/6685e3f3773638f4d641af3eec276ce5ce2b0d4c/src/services/providers/liveCoinWatch.ts#L164)

***

### getInstance()

> `static` **getInstance**(): [`LiveCoinWatch`](LiveCoinWatch.md)

Returns the singleton instance of the LiveCoinWatch class.

#### Returns

[`LiveCoinWatch`](LiveCoinWatch.md)

The singleton instance of LiveCoinWatch.

#### Example

```typescript
const liveCoinWatch = LiveCoinWatch.getInstance();
```

#### Defined in

[src/services/providers/liveCoinWatch.ts:92](https://github.com/ZelCore-io/rates-api/blob/6685e3f3773638f4d641af3eec276ce5ce2b0d4c/src/services/providers/liveCoinWatch.ts#L92)
