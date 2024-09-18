import { coinAggregatorIDs } from './coinAggregatorIDs';
import * as log from '../lib/log';
import { CoinGecko, CryptoCompare, LiveCoinWatch } from './providers';


export async function getAll(): Promise<any[]> {

  const markets: any[] = [];
  const cmk: Record<string, any> = {};
  const errors: { errors: Record<string, any> } = { errors: {} };

  // full results from cryptocompare
  try {
    const cryptocompare = await CryptoCompare.getInstance().getMarketData(coinAggregatorIDs.cryptoCompare, 'USD');
    const coinsCC = Object.keys(cryptocompare);
    coinsCC.forEach((coin) => {
      cmk[coin] = {
        supply: cryptocompare[coin].USD.SUPPLY,
        volume: cryptocompare[coin].USD.TOTALVOLUME24HTO,
        change: cryptocompare[coin].USD.CHANGEPCT24HOUR,
        market: cryptocompare[coin].USD.MKTCAP,
      };
    });
  } catch (e) {
    log.error('cryptocompare error');
    log.error(e);
    errors.errors.cryptocompare = true;
  }

  // full results from coingecko
  try {
    const coingecko = await CoinGecko.getInstance().getExchangeRates(coinAggregatorIDs.coingecko, 'usd');

    coingecko.forEach((coin: any) => {
      cmk[coin.symbol.toUpperCase()] = {
        rank: coin.market_cap_rank,
        total_supply: coin.total_supply,
        supply: coin.circulating_supply,
        volume: coin.total_volume,
        change: coin.price_change_percentage_24h,
        change7d: coin.price_change_percentage_7d_in_currency,
        market: coin.market_cap,
      };
    });
  } catch (e) {
    log.error('coingecko error');
    log.error(e);
    errors.errors.coingecko = true;
  }
  
  try {
    const livecoinwatch = await LiveCoinWatch.getInstance().getExchangeRates(coinAggregatorIDs.livecoinwatch, 'USD');

    Object.values(livecoinwatch).forEach((coin: any) => {
      cmk[coin.code] = {
        rank: coin.rank,
        total_supply: coin.totalSupply,
        supply: coin.circulatingSupply,
        volume: coin.volume,
        change: coin.delta.day ? (1 - coin.delta.day) * 100 : 0,
        change7d: coin.delta.week ? (1 - coin.delta.week) * 100 : 0,
        market: coin.cap ? coin.cap : coin.circulatingSupply * coin.rate,
      };
    });
  } catch (e) {
    log.error('livecoinwatch error');
    log.error(e);
    errors.errors.livecoinwatch = true;
  }

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
