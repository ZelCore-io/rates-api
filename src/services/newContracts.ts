import { ContractWithType, FoundContractStore } from '../types';
import * as log from '../lib/log';
import { cgContractMap } from './coinAggregatorIDs';

/**
 * Stores the found contracts with their occurrence count.
 */
export const foundContracts: FoundContractStore = {};

/**
 * Checks the provided contracts against the CoinGecko contract map and updates the `foundContracts` store.
 *
 * This function iterates over an array of contracts, checks if they exist in the CoinGecko contract map,
 * and updates the `foundContracts` object by incrementing the count or adding a new entry.
 *
 * @param contracts - An array of contracts with their types.
 * @returns `true` if the operation succeeds, `false` otherwise.
 *
 * @example
 * ```typescript
 * import { checkContracts } from './newContracts';
 *
 * const contracts = [
 *   { address: '0x123...', type: 'ERC20' },
 *   { address: '0xabc...', type: 'ERC20' },
 * ];
 *
 * const success = checkContracts(contracts);
 * console.log('Contracts checked:', success);
 * ```
 */
export function checkContracts(contracts: ContractWithType[]): boolean {
  try {
    for (const contract of contracts) {
      const cg = cgContractMap[contract.address];
      if (cg) {
        if (foundContracts[contract.address]) {
          foundContracts[contract.address].count++;
        } else {
          foundContracts[contract.address] = { zel: contract, cg, count: 1 };
        }
      }
    }
    return true;
  } catch (error) {
    log.error(error);
    return false;
  }
}