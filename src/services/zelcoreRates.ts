import axios from 'axios';
import config from '../../config';
import { cryptoCompareIDs, coingeckoIDs, liveCoinWatchIDs } from './coinAggregatorIDs';
import * as log from '../lib/log';

const apiKey: string = process.env.API_KEY || config.apiKey;

function apiRequest(url: string): Promise<any> {
  return axios.get(url)
    .then((response) => response.data)
    .catch((error) => {
      log.error(`ERROR: ${url}`);
      return error;
    });
}

function apiRequestPost(url: string, coinList: string[]): Promise<any> {
  const data = {
    currency: 'BTC',
    codes: coinList,
    sort: 'rank',
    order: 'ascending',
    offset: 0,
    limit: 0,
    meta: true,
  };
  const headers = {
    'x-api-key': 'c9f00288-bea1-49a3-a9c3-2219d61aa0d1',
  };
  const axiosConfig = {
    headers,
  };
  return axios.post(url, data, axiosConfig)
    .then((response) => response.data)
    .catch((error) => {
      log.error(`ERROR: ${url}`);
      return error;
    });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function getAll(): Promise<any[]> {
  const results: any[] = [];
  const getUrls = [
    // fiat rates
    'https://bitpay.com/rates/BTC',
    // cryptocompare
    ...cryptoCompareIDs.map((elementGroup) => `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${elementGroup}&tsyms=BTC&api_key=${apiKey}`),
    // coingecko
    ...coingeckoIDs.map((elementGroup) => `https://api.coingecko.com/api/v3/coins/markets?vs_currency=btc&ids=${elementGroup}&order=market_cap_desc&per_page=100&page=1&sparkline=false`),
  ];
  const postUrls = [
    // livecoinwatch
    {
      url: 'https://api.livecoinwatch.com/coins/map',
      coinList: liveCoinWatchIDs,
    },
  ];

  console.log(getUrls);

  for (const promise of getUrls) {
    const res = await apiRequest(promise);
    console.log(res);
    results.push(res);
    await delay(25000);
  }

  for (const promise of postUrls) {
    const res = await apiRequestPost(promise.url, promise.coinList);
    console.log(res);
    results.push(res);
    await delay(25000);
  }

  const rates: any[] = [];
  const efg: Record<string, any> = {};
  let bitpayData: any[] = [{ code: 'USD', rate: 22000 }];
  const errors: { errors: Record<string, any> } = { errors: {} };

  // results from bitpay (fiat rates)
  try {
    const dummyTest = results[0].data[1].code;
    if (!dummyTest) {
      throw new Error('Bitpay does not work correctly');
    }
    bitpayData = results[0].data;
  } catch (e) {
    errors.errors.bitPayData = results[0].data;
  }

  // results from coingecko (prices)
  const dataCG = results.slice(1 + cryptoCompareIDs.length, 1 + cryptoCompareIDs.length + coingeckoIDs.length);
  dataCG.forEach((subresult) => {
    try {
      const coinsCG = Object.keys(subresult);
      coinsCG.forEach((index) => {
        efg[subresult[index].symbol.toUpperCase()] = subresult[index].current_price;
      });
    } catch (e) {
      errors.errors.coinsCG = subresult;
    }
  });

  // results from cryptocompare (prices)
  const dataCC = results.slice(1, 1 + cryptoCompareIDs.length);
  dataCC.forEach((subresult) => {
    try {
      const coinsCC = Object.keys(subresult);
      coinsCC.forEach((coin) => {
        efg[coin] = subresult[coin].BTC;
      });
    } catch (e) {
      errors.errors.coinsCC = subresult;
    }
  });

  const dataLCW = results[results.length - 1];
  dataLCW.forEach((coin: any) => {
    efg[coin.code] = coin.rate;
  });

  // assets with zero value or no usable API
  efg.TESTZEL = 0;
  efg.DIBI = 0;
  efg.POR = 0;
  efg.GUNTHY = 0;
  efg.BXY = 0.00001249;
  efg.FISH = 0;
  efg.GCBEST = efg.USDT;
  efg.GCHD = efg.USDT;
  efg.GCLOWE = efg.USDT;
  efg.GCSTAR = efg.USDT;
  efg.GCTGT = efg.USDT;
  efg.GCSWAL = efg.USDT;
  efg.ONG = efg.ONGAS;
  efg.SAI = efg.DAI;
  efg.WBNB = efg.BNB;
  efg.ARN = efg.ARNX;
  efg.ZEL = efg.FLUX;
  efg['FLUX-KDA'] = efg.FLUX;
  efg['FLUX-ETH'] = efg.FLUX;
  efg['FLUX-BNB'] = efg.FLUX;
  efg['FLUX-TRX'] = efg.FLUX;
  efg['FLUX-BSC'] = efg.FLUX;
  efg['FLUX-SOL'] = efg.FLUX;
  efg['FLUX-AVAX'] = efg.FLUX;
  efg['FLUX-ERG'] = efg.FLUX;
  efg['FLUX-ERGO'] = efg.FLUX;
  efg['FLUX-ALGO'] = efg.FLUX;
  efg['FLUX-MATIC'] = efg.FLUX;
  efg['FLUX-BASE'] = efg.FLUX;
  efg['AVAX-C'] = efg.AVAX;
  efg['AVAX-P'] = efg.AVAX;
  efg['AVAX-X'] = efg.AVAX;
  efg.TESTWND = 0;
  efg.TESTBTC = 0;
  efg.TESTETH = 0;
  efg.MSRM = efg.SRM * 1000000;
  efg.WSOL = efg.SOL;
  efg.WETH = efg.ETH;
  efg.WMATIC = efg.MATIC;
  efg.kFRAX = efg.FRAX;
  efg.GLINK = efg.TENT;
  efg.BABE = efg.KDA / 4.2;
  efg.KDX = efg.KDA / 28;
  efg.SKDX = efg.KDA / 28;
  efg.MOK = efg.KDA / 125;
  efg.zUSD = efg.USDC;
  efg.TUSDOLD = efg.TUSD;
  efg['USDC.E'] = efg.USDC;

  rates.push(bitpayData);
  rates.push(efg);
  rates.push(errors);

  return rates;
}

export default {
  getAll,
};
