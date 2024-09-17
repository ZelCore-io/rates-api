import { Request, Response } from 'express';
import zlib from 'zlib';
import * as log from '../lib/log';
import zelcoreRates from './zelcoreRates';
import zelcoreMarketsUSD from './zelcoreMarketsUSD';
import zelcoreRatesV2 from './zelcoreRatesV2';
import { getLatestCoinInfo } from './coinAggregatorIDs';
import { PricesResponse } from '../types';

let rates: any[] = [[], {}, {}]; // btc to fiat, alts to fiat, errors
let marketsUSD: any[] = [];

const ratesV2: PricesResponse = {} as PricesResponse;

export async function getRates(req: Request, res: Response): Promise<void> {
  try {
    res.json(rates);
  } catch (error) {
    log.error(error);
  }
}

export async function getRatesV2(req: Request, res: Response): Promise<void> {
  try {
    res.json(ratesV2);
  } catch (error) {
    log.error(error);
  }
}

export async function getRatesV2Compressed(req: Request, res: Response): Promise<void> {
  try {
    const compressed = zlib.gzipSync(JSON.stringify(ratesV2));
    res.json(compressed);
  } catch (error) {
    log.error(error);
  }
}

export function getData() {
  return {
    rates,
    marketsUSD,
  };
}

export async function getMarketsUsd(req: Request, res: Response): Promise<void> {
  try {
    res.json(marketsUSD);
  } catch (error) {
    log.error(error);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function dataRefresher(): Promise<void> {
  try {
    log.info('Refreshing Coin Info and Aggregator IDs');
    await getLatestCoinInfo();
    log.info('Refreshment finished');
    setTimeout(() => {
      dataRefresher();
    }, 60 * 60 * 1000);
  } catch (error) {
    log.error("Error in dataRefresher");
    log.error(error);
    setTimeout(() => {
      dataRefresher();
    }, 30 * 60 * 1000);
  }
}

export async function serviceRefresher(): Promise<void> {
  try {
    log.info('Refreshing Markets and Rates');
    const ratesFetched = await zelcoreRates.getAll();
    const marketsUSDFetched = await zelcoreMarketsUSD.getAll();
    const ratesV2Fetched = await zelcoreRatesV2.getAll();
    
    if (ratesFetched && ratesFetched[0]?.length > 20 && ratesFetched[1]) {
      if (Object.keys(ratesFetched[1]).length > 300) {
        rates = ratesFetched;
      }
    }
    
    if (marketsUSDFetched && marketsUSDFetched[0]) {
      log.info(Object.keys(marketsUSDFetched[0]));
      log.info(Object.keys(marketsUSDFetched[0]).length);
      if (Object.keys(marketsUSDFetched[0]).length > 300) {
        marketsUSD = marketsUSDFetched;
      }
    }

    if (ratesV2Fetched && ratesV2Fetched.fiat.length > 20 && ratesV2Fetched.crypto.length > 300) {
      ratesV2.crypto = ratesV2Fetched.crypto;
      ratesV2.fiat = ratesV2Fetched.fiat;
    }

    log.info('Refreshment finished');
    await delay(30 * 1000);
    serviceRefresher();
  } catch (error) {
    log.error(error);
    await delay(30 * 1000);
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
};
