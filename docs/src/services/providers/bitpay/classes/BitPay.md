[**rates-api v3.0.0**](../../../../../README.md)

***

[rates-api](../../../../../modules.md) / [src/services/providers/bitpay](../README.md) / BitPay

# Class: BitPay

Defined in: [src/services/providers/bitpay.ts:24](https://github.com/ZelCore-io/rates-api/blob/master/src/services/providers/bitpay.ts#L24)

Singleton class to interact with the BitPay API.

This class provides methods to retrieve fiat currency exchange rates from the BitPay API.
It uses an LRU (Least Recently Used) cache to store responses and minimize API calls.

## Example

```typescript
import { BitPay } from './bitpay';

async function fetchRates() {
  const bitPay = BitPay.getInstance();
  const rates = await bitPay.getFiatRates();
  console.log('Fiat Rates:', rates);
}

fetchRates();
```

## Constructors

### Constructor

> **new BitPay**(): `BitPay`

Defined in: [src/services/providers/bitpay.ts:58](https://github.com/ZelCore-io/rates-api/blob/master/src/services/providers/bitpay.ts#L58)

Private constructor to enforce the singleton pattern.

Initializes the AxiosWrapper and the LRU cache.

#### Returns

`BitPay`

#### Throws

If an instance already exists.

## Methods

### getFiatRates()

> **getFiatRates**(): `Promise`\<`any`\>

Defined in: [src/services/providers/bitpay.ts:115](https://github.com/ZelCore-io/rates-api/blob/master/src/services/providers/bitpay.ts#L115)

Retrieves fiat currency exchange rates from the BitPay API.

Utilizes caching to prevent unnecessary API calls. If the rates are cached and valid,
it returns them directly from the cache. Otherwise, it fetches new rates from the API.

#### Returns

`Promise`\<`any`\>

The exchange rates data or `null` if an error occurs.

#### Example

```typescript
const bitPay = BitPay.getInstance();
const rates = await bitPay.getFiatRates();
console.log(rates);
```

***

### getInstance()

> `static` **getInstance**(): `BitPay`

Defined in: [src/services/providers/bitpay.ts:81](https://github.com/ZelCore-io/rates-api/blob/master/src/services/providers/bitpay.ts#L81)

Returns the singleton instance of the BitPay class.

#### Returns

`BitPay`

The singleton instance of BitPay.

#### Example

```typescript
const bitPay = BitPay.getInstance();
```
