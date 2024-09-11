import axios from 'axios';
import config from '../../config';
import { cryptoCompareIDs, coingeckoIDs, cg4ccIDs, liveCoinWatchIDs } from './coinAggregatorIDs';
import * as log from '../lib/log';

const apiKey: string = process.env.API_KEY || config.apiKey;
coingeckoIDs.push(...cg4ccIDs); // Adding coingecko ids for cryptocompare coins

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
    currency: 'USD',
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
    // cryptocompare
    ...cryptoCompareIDs.map((elementGroup) => `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${elementGroup}&tsyms=USD&api_key=${apiKey}`),
    // coingecko
    ...coingeckoIDs.map((elementGroup) => `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${elementGroup}&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=7d`),
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

  const markets: any[] = [];
  const cmk: Record<string, any> = {};
  const errors: { errors: Record<string, any> } = { errors: {} };

  // full results from cryptocompare
  const dataCC = results.slice(0, cryptoCompareIDs.length);
  dataCC.forEach((subresult) => {
    try {
      const coinsFull = Object.keys(subresult.RAW);
      coinsFull.forEach((coin) => {
        const coindetail: any = {};
        coindetail.supply = subresult.RAW[coin].USD.SUPPLY;
        coindetail.volume = subresult.RAW[coin].USD.TOTALVOLUME24HTO;
        coindetail.change = subresult.RAW[coin].USD.CHANGEPCT24HOUR;
        coindetail.market = subresult.RAW[coin].USD.MKTCAP;
        cmk[coin] = coindetail;
      });
    } catch (e) {
      errors.errors.coinsFull = subresult;
    }
  });

  // full results from coingecko
  const dataCG = results.slice(cryptoCompareIDs.length, cryptoCompareIDs.length + coingeckoIDs.length);
  dataCG.forEach((subresult) => {
    try {
      const coinsFull = Object.keys(subresult);
      coinsFull.forEach((coin) => {
        const coindetail: any = {};
        coindetail.rank = subresult[coin].market_cap_rank;
        coindetail.total_supply = subresult[coin].total_supply;
        coindetail.supply = subresult[coin].circulating_supply;
        coindetail.volume = subresult[coin].total_volume;
        coindetail.change = subresult[coin].price_change_percentage_24h;
        coindetail.change7d = subresult[coin].price_change_percentage_7d_in_currency;
        coindetail.market = subresult[coin].market_cap;
        cmk[subresult[coin].symbol.toUpperCase()] = coindetail;
      });
    } catch (e) {
      errors.errors.coinsFull = subresult;
    }
  });

  const dataLCW = results[results.length - 1];
  dataLCW.forEach((coin: any) => {
    const coindetail: any = {};
    coindetail.rank = coin.rank;
    coindetail.total_supply = coin.totalSupply;
    coindetail.supply = coin.circulatingSupply;
    coindetail.volume = coin.volume;
    coindetail.change = coin.delta.day ? (1 - coin.delta.day) * 100 : 0;
    coindetail.change7d = coin.delta.week ? (1 - coin.delta.week) * 100 : 0;
    coindetail.market = coin.cap ? coin.cap : coin.circulatingSupply * coin.rate;
    cmk[coin.code] = coindetail;
  });

  // Some wrapped assets and flux
  cmk.ONG = cmk.ONGAS;
  cmk.SAI = cmk.DAI;
  cmk.WBNB = cmk.BNB;
  cmk.ARN = cmk.ARNX;
  cmk.ZEL = cmk.FLUX;
  cmk['FLUX-KDA'] = cmk.FLUX;
  cmk['FLUX-ETH'] = cmk.FLUX;
  cmk['FLUX-BNB'] = cmk.FLUX;
  cmk['FLUX-TRX'] = cmk.FLUX;
  cmk['FLUX-BSC'] = cmk.FLUX;
  cmk['FLUX-SOL'] = cmk.FLUX;
  cmk['FLUX-AVAX'] = cmk.FLUX;
  cmk['FLUX-ERG'] = cmk.FLUX;
  cmk['FLUX-ERGO'] = cmk.FLUX;
  cmk['FLUX-ALGO'] = cmk.FLUX;
  cmk['FLUX-MATIC'] = cmk.FLUX;
  cmk['FLUX-BASE'] = cmk.FLUX;
  cmk['AVAX-C'] = cmk.AVAX;
  cmk['AVAX-P'] = cmk.AVAX;
  cmk['AVAX-X'] = cmk.AVAX;
  cmk.MSRM = cmk.SRM;
  cmk.WSOL = cmk.SOL;
  cmk.WETH = cmk.ETH;
  cmk.WMATIC = cmk.MATIC;
  cmk.kFRAX = cmk.FRAX;
  cmk.GLINK = cmk.TENT;
  cmk.zUSD = cmk.USDC;
  cmk.TUSDOLD = cmk.TUSD;
  cmk.BABE = {
    total_supply: 1720082,
    supply: 22001,
    volume: 0,
    market: 0,
    rank: 0,
    change: cmk.KDA ? cmk.KDA.change : 0,
  };
  cmk['USDC.E'] = cmk.USDC;

  markets.push(cmk);
  markets.push(errors);

  return markets;
}

export default {
  getAll,
};
