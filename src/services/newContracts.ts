import { ContractWithType, FoundContractStore } from '../types';
import * as log from '../lib/log';
import { cgContractMap } from './coinAggregatorIDs';

export const foundContracts: FoundContractStore = {};

export function checkContracts(contracts: ContractWithType[]): boolean {
  try {
    for (const contract of contracts) {
      const cg = cgContractMap[contract.address];
      if (cg ) {
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