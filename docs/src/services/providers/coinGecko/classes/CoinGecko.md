[**rates-api v3.0.0**](../../../../../README.md) • **Docs**

***

[rates-api v3.0.0](../../../../../modules.md) / [src/services/providers/coinGecko](../README.md) / CoinGecko

# Class: CoinGecko

Singleton class to interact with the CoinGecko API.

This class provides methods to retrieve cryptocurrency data from CoinGecko.
It handles API requests, caching, and rate limiting.

## Example

```typescript
import { CoinGecko } from './coingecko';

async function fetchRates() {
  const coinGecko = CoinGecko.getInstance();
  const rates = await coinGecko.getExchangeRates(['bitcoin', 'ethereum']);
  console.log('Exchange Rates:', rates);
}

fetchRates();
```

## Constructors

### new CoinGecko()

> **new CoinGecko**(): [`CoinGecko`](CoinGecko.md)

Private constructor to enforce the singleton pattern.

Initializes the AxiosWrapper and the LRU cache.

#### Returns

[`CoinGecko`](CoinGecko.md)

#### Throws

If an instance already exists.

#### Defined in

[src/services/providers/coinGecko.ts:81](https://github.com/ZelCore-io/rates-api/blob/691ee3db71a277710156f53a41c1ecb57cce5d58/src/services/providers/coinGecko.ts#L81)

## Methods

### getAssetPlatformData()

> **getAssetPlatformData**(): `Promise`\<`any`\>

Retrieves asset platform data from CoinGecko.

#### Returns

`Promise`\<`any`\>

The asset platform data or `null` if an error occurs.

#### Example

```typescript
const coinGecko = CoinGecko.getInstance();
const assetPlatforms = await coinGecko.getAssetPlatformData();
console.log('Asset Platforms:', assetPlatforms);
```

#### Defined in

[src/services/providers/coinGecko.ts:207](https://github.com/ZelCore-io/rates-api/blob/691ee3db71a277710156f53a41c1ecb57cce5d58/src/services/providers/coinGecko.ts#L207)

***

### getCoinsList()

> **getCoinsList**(`includePlatform`): `Promise`\<`any`\>

Retrieves a list of all coins supported by CoinGecko.

#### Parameters

• **includePlatform**: `boolean` = `true`

Whether to include platform data in the response (default is `true`).

#### Returns

`Promise`\<`any`\>

The list of coins or `null` if an error occurs.

#### Example

```typescript
const coinGecko = CoinGecko.getInstance();
const coinsList = await coinGecko.getCoinsList();
console.log('Coins List:', coinsList);
```

#### Defined in

[src/services/providers/coinGecko.ts:173](https://github.com/ZelCore-io/rates-api/blob/691ee3db71a277710156f53a41c1ecb57cce5d58/src/services/providers/coinGecko.ts#L173)

***

### getExchangeRates()

> **getExchangeRates**(`ids`, `vsCurrency`): `Promise`\<[`CoinGeckoPrice`](../../../../types/type-aliases/CoinGeckoPrice.md)[]\>

Retrieves exchange rates for an array of coin IDs.

Handles splitting the IDs into batches to comply with API limitations.

#### Parameters

• **ids**: `string`[]

An array of coin IDs.

• **vsCurrency**: `string` = `'btc'`

The target currency (default is 'btc').

#### Returns

`Promise`\<[`CoinGeckoPrice`](../../../../types/type-aliases/CoinGeckoPrice.md)[]\>

An array of `CoinGeckoPrice` objects.

#### Example

```typescript
const coinGecko = CoinGecko.getInstance();
const rates = await coinGecko.getExchangeRates(['bitcoin', 'ethereum', 'litecoin']);
console.log('Exchange Rates:', rates);
```

#### Defined in

[src/services/providers/coinGecko.ts:278](https://github.com/ZelCore-io/rates-api/blob/691ee3db71a277710156f53a41c1ecb57cce5d58/src/services/providers/coinGecko.ts#L278)

***

### getKeyUsage()

> **getKeyUsage**(): `Promise`\<`null` \| `KeyUsage`\>

Retrieves the usage statistics of the CoinGecko API key.

Utilizes caching to prevent unnecessary API calls. If the data is cached and valid,
it returns it directly from the cache. Otherwise, it fetches new data from the API.

#### Returns

`Promise`\<`null` \| `KeyUsage`\>

The key usage data or `null` if an error occurs.

#### Example

```typescript
const coinGecko = CoinGecko.getInstance();
const usage = await coinGecko.getKeyUsage();
console.log('API Key Usage:', usage);
```

#### Defined in

[src/services/providers/coinGecko.ts:138](https://github.com/ZelCore-io/rates-api/blob/691ee3db71a277710156f53a41c1ecb57cce5d58/src/services/providers/coinGecko.ts#L138)

***

### getInstance()

> `static` **getInstance**(): [`CoinGecko`](CoinGecko.md)

Returns the singleton instance of the CoinGecko class.

#### Returns

[`CoinGecko`](CoinGecko.md)

The singleton instance of CoinGecko.

#### Example

```typescript
const coinGecko = CoinGecko.getInstance();
```

#### Defined in

[src/services/providers/coinGecko.ts:104](https://github.com/ZelCore-io/rates-api/blob/691ee3db71a277710156f53a41c1ecb57cce5d58/src/services/providers/coinGecko.ts#L104)
