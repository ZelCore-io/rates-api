import { Request, Response } from 'express';
import * as log from '../lib/log';
import zelcoreRates from './zelcoreRates';
import zelcoreMarketsUSD from './zelcoreMarketsUSD';

let rates: any[] = [[], {}, {}]; // btc to fiat, alts to fiat, errors
let marketsUSD: any[] = [];

export async function getRates(req: Request, res: Response): Promise<void> {
  try {
    res.json(rates);
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

export async function serviceRefresher(): Promise<void> {
  try {
    log.info('Refreshing Markets and Rates');
    const ratesFetched = await zelcoreRates.getAll();
    const marketsUSDFetched = await zelcoreMarketsUSD.getAll();
    
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

    log.info('Refreshment finished');
    await delay(60000);
    serviceRefresher();
  } catch (error) {
    log.error(error);
    await delay(60000);
    serviceRefresher();
  }
}

export default {
  getRates,
  getMarketsUsd,
  serviceRefresher,
  getData,
};
