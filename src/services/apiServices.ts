import { Request, Response } from 'express';
import zlib from 'zlib';
import * as log from '../lib/log';
import { mergeDeep } from '../lib/objects';
import zelcoreRates from './zelcoreRates';
import zelcoreMarketsUSD from './zelcoreMarketsUSD';
import zelcoreRatesV2 from './zelcoreRatesV2';
import { getLatestCoinInfo } from './coinAggregatorIDs';
import { checkContracts, foundContracts } from './newContracts';
import { PricesResponse, FoundContractStore, MarketsData, RatesData } from '../types';

/**
 * Stores exchange rates data.
 *
 * Structure:
 * - `rates[0]`: BTC to fiat exchange rates.
 * - `rates[1]`: Alternative coins to fiat exchange rates.
 * - `rates[2]`: Errors object.
 */
let rates: RatesData = [[], {}, { errors: {} }]; // btc to fiat, alts to fiat, errors

/**
 * Stores market data in USD.
 *
 * Structure:
 * - `marketsUSD[0]`: BTC to USD market data.
 * - `marketsUSD[1]`: Errors object.
 */
let marketsUSD: MarketsData = [{}, { errors: {} }]; // btc to usd, alts to usd, errors

/**
 * Stores version 2 of the rates data.
 */
const ratesV2: PricesResponse = {} as PricesResponse;

/**
 * Handles the GET request to retrieve exchange rates.
 *
 * @param req - The Express request object.
 * @param res - The Express response object.
 *
 * @example
 * ```typescript
 * app.get('/rates', getRates);
 * ```
 */
export async function getRates(req: Request, res: Response): Promise<void> {
  try {
    res.json(rates);
  } catch (error) {
    log.error(error);
  }
}

/**
 * Handles the GET request to retrieve version 2 of the exchange rates.
 *
 * @param req - The Express request object.
 * @param res - The Express response object.
 *
 * @example
 * ```typescript
 * app.get('/rates/v2', getRatesV2);
 * ```
 */
export async function getRatesV2(req: Request, res: Response): Promise<void> {
  try {
    res.json(ratesV2);
  } catch (error) {
    log.error(error);
  }
}

/**
 * Handles the GET request to retrieve compressed version of the exchange rates (version 2).
 *
 * @param req - The Express request object.
 * @param res - The Express response object.
 *
 * @example
 * ```typescript
 * app.get('/rates/v2/compressed', getRatesV2Compressed);
 * ```
 */
export async function getRatesV2Compressed(req: Request, res: Response): Promise<void> {
  try {
    const compressed = zlib.gzipSync(JSON.stringify(ratesV2));
    res.json(compressed);
  } catch (error) {
    log.error(error);
  }
}

/**
 * Retrieves the current rates and market data.
 *
 * @returns An object containing `rates` and `marketsUSD`.
 *
 * @example
 * ```typescript
 * const data = getData();
 * console.log(data.rates, data.marketsUSD);
 * ```
 */
export function getData() {
  return {
    rates,
    marketsUSD,
  };
}

/**
 * Handles the GET request to retrieve market data in USD.
 *
 * @param req - The Express request object.
 * @param res - The Express response object.
 *
 * @example
 * ```typescript
 * app.get('/markets/usd', getMarketsUsd);
 * ```
 */
export async function getMarketsUsd(req: Request, res: Response): Promise<void> {
  try {
    res.json(marketsUSD);
  } catch (error) {
    log.error(error);
  }
}

/**
 * Retrieves the found contracts.
 *
 * @returns The `foundContracts` object.
 *
 * @example
 * ```typescript
 * const contracts = getFoundContracts();
 * ```
 */
export function getFoundContracts(): FoundContractStore {
  return foundContracts;
}

/**
 * Handles the request to check for new contracts.
 *
 * @param req - The Express request object containing `contracts` in the body.
 * @param res - The Express response object.
 *
 * @example
 * ```typescript
 * app.post('/contracts/check', checkContractsV2);
 * ```
 */
export async function checkContractsV2(req: Request, res: Response): Promise<void> {
  try {
    const contracts = req.body.contracts;
    const success = checkContracts(contracts);
    res.json({ success });
  } catch (error) {
    log.error(error);
  }
}

/**
 * Delays execution for a specified number of milliseconds.
 *
 * @param ms - The number of milliseconds to delay.
 * @returns A promise that resolves after the specified delay.
 *
 * @example
 * ```typescript
 * await delay(1000); // Waits for 1 second
 * ```
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Periodically refreshes coin information and aggregator IDs.
 *
 * This function logs the start of the refresh process, calls `getLatestCoinInfo`,
 * and sets a timeout to call itself again after 1 hour. If an error occurs, it
 * logs the error and retries after 30 minutes.
 *
 * @example
 * ```typescript
 * dataRefresher();
 * ```
 */
export async function dataRefresher(): Promise<void> {
  try {
    log.info('Refreshing Coin Info and Aggregator IDs');
    await getLatestCoinInfo();
    log.info('Refreshment finished');
    setTimeout(() => {
      dataRefresher();
    }, 60 * 60 * 1000); // 1 hour
  } catch (error) {
    log.error("Error in dataRefresher");
    log.error(error);
    setTimeout(() => {
      dataRefresher();
    }, 30 * 60 * 1000); // 30 minutes
  }
}

/**
 * Periodically refreshes market data and exchange rates.
 *
 * Fetches data from `zelcoreRates`, `zelcoreMarketsUSD`, and `zelcoreRatesV2`,
 * merges the fetched data with existing data, and handles errors.
 * Sets a delay before calling itself again.
 *
 * @example
 * ```typescript
 * serviceRefresher();
 * ```
 */
export async function serviceRefresher(): Promise<void> {
  try {
    log.info('Refreshing Markets and Rates');
    const ratesFetched = await zelcoreRates.getAll();
    const marketsUSDFetched = await zelcoreMarketsUSD.getAll();
    const ratesV2Fetched = await zelcoreRatesV2.getAll();
    
    if (ratesFetched && ratesFetched[0]?.length > 20 && ratesFetched[1]) {
      if (Object.keys(ratesFetched[1]).length > 300) {
        rates = mergeDeep(rates, ratesFetched);
        rates[2] = ratesFetched[2]; // replace errors
      }
    }
    
    if (marketsUSDFetched && marketsUSDFetched[0]) {
      log.info(Object.keys(marketsUSDFetched[0]));
      log.info(Object.keys(marketsUSDFetched[0]).length);
      if (Object.keys(marketsUSDFetched[0]).length > 300) {
        marketsUSD = mergeDeep(marketsUSD, marketsUSDFetched);
        marketsUSD[1] = marketsUSDFetched[1]; // replace errors
      }
    }

    if (ratesV2Fetched && ratesV2Fetched.fiat.length > 20 && ratesV2Fetched.crypto.length > 300) {
      ratesV2.fiat = mergeDeep(ratesV2.fiat, ratesV2Fetched.fiat);
      ratesV2.crypto = mergeDeep(ratesV2.crypto, ratesV2Fetched.crypto);
      ratesV2.errors = ratesV2Fetched.errors;
    }

    log.info('Refreshment finished');
    await delay(30 * 1000); // Wait 30 seconds
    serviceRefresher();
  } catch (error) {
    log.error(error);
    await delay(30 * 1000); // Wait 30 seconds
    serviceRefresher();
  }
}

export default {
  getRates,
  getMarketsUsd,
  dataRefresher,
  serviceRefresher,
  getData,
  getRatesV2,
  getRatesV2Compressed,
  getFoundContracts,
  checkContractsV2,
};
