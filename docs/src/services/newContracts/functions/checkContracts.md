[**rates-api v3.0.0**](../../../../README.md) • **Docs**

***

[rates-api v3.0.0](../../../../modules.md) / [src/services/newContracts](../README.md) / checkContracts

# Function: checkContracts()

> **checkContracts**(`contracts`): `boolean`

Checks the provided contracts against the CoinGecko contract map and updates the `foundContracts` store.

This function iterates over an array of contracts, checks if they exist in the CoinGecko contract map,
and updates the `foundContracts` object by incrementing the count or adding a new entry.

## Parameters

• **contracts**: [`ContractWithType`](../../../types/type-aliases/ContractWithType.md)[]

An array of contracts with their types.

## Returns

`boolean`

`true` if the operation succeeds, `false` otherwise.

## Example

```typescript
import { checkContracts } from './newContracts';

const contracts = [
  { address: '0x123...', type: 'ERC20' },
  { address: '0xabc...', type: 'ERC20' },
];

const success = checkContracts(contracts);
console.log('Contracts checked:', success);
```

## Defined in

[src/services/newContracts.ts:32](https://github.com/ZelCore-io/rates-api/blob/6685e3f3773638f4d641af3eec276ce5ce2b0d4c/src/services/newContracts.ts#L32)
