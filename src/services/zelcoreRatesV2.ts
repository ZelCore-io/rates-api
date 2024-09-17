import { coinAggregatorIDs } from './coinAggregatorIDs';
import * as log from '../lib/log';
import { CoinGecko, BitPay, CryptoCompare, LiveCoinWatch } from './providers';
import { PricesResponse, CryptoPrice } from '../types';

export async function getAll(): Promise<PricesResponse> {
  const cg = CoinGecko.getInstance();
  const bitpay = BitPay.getInstance();
  const lcw = LiveCoinWatch.getInstance();
  const cc = CryptoCompare.getInstance();

  const cgPromise = cg.getExchangeRates(coinAggregatorIDs.coingecko);
  const cgPromiseUsd = cg.getExchangeRates(coinAggregatorIDs.coingecko, 'usd');
  const bitpayPromise = bitpay.getFiatRates();
  const lcwPromise = lcw.getExchangeRates(coinAggregatorIDs.livecoinwatch);
  const lcwPromiseUsd = lcw.getExchangeRates(coinAggregatorIDs.livecoinwatch, 'USD');
  const ccPromise = cc.getMarketData(coinAggregatorIDs.cryptoCompare);
  const ccPromiseUsd = cc.getMarketData(coinAggregatorIDs.cryptoCompare, 'USD');

  const coingecko = await cgPromise;
  const coingeckoUsd = await cgPromiseUsd;
  const bitpayRates = await bitpayPromise;
  const livecoinwatch = await lcwPromise;
  const livecoinwatchUsd = await lcwPromiseUsd;
  const cryptocompare = await ccPromise;
  const cryptocompareUsd = await ccPromiseUsd;

  const processed: CryptoPrice[] = coingeckoUsd.map((coin) => {
    const btcRate = coingecko.find((c) => c.id === coin.id)?.current_price || 0;
    const usdRate = coin.current_price;
    return {
      id: coin.id,
      provider: 'coingecko',
      rates: {
        btc: btcRate,
        usd: usdRate,
      },
      supply: coin.circulating_supply,
      volume: coin.total_volume,
      change24h: coin.price_change_percentage_24h,
      market: coin.market_cap,
      rank: coin.market_cap_rank,
      total_supply: coin.total_supply,
      change7d: coin.price_change_percentage_7d_in_currency
    };
  });
  processed.push(...Object.entries(cryptocompareUsd).map(([id, market]) => {
    const btcMarket = cryptocompare[id].BTC;
    const usdMarket = market.USD;
    return {
      id,
      provider: 'cryptocompare',
      rates: {
        btc: btcMarket.PRICE,
        usd: usdMarket.PRICE,
      },
      supply: usdMarket.SUPPLY,
      volume: usdMarket.VOLUME24HOURTO,
      change24h: usdMarket.CHANGEPCT24HOUR,
      market: usdMarket.MKTCAP,
      total_supply: usdMarket.TOTALVOLUME24H,
    }
  }));

  processed.push(...livecoinwatchUsd.map((coin) => {
    const btcRate = livecoinwatch.find((c) => c.code === coin.code)?.rate || 0;
    const usdRate = coin.rate || 0;
    const supply = coin.circulatingSupply || 0;
    const volume = coin.volume || 0;
    return {
      id: coin.code,
      provider: 'livecoinwatch',
      rates: {
        btc: btcRate,
        usd: usdRate,
      },
      rank: coin.rank,
      supply,
      volume,
      change24h: coin.delta.day ? (1 - coin.delta.day) * 100 : 0,
      change7d: coin.delta.week ? (1 - coin.delta.week) * 100 : 0,
      market: coin.cap ? coin.cap : supply * usdRate,
      total_supply: coin.totalSupply,
    }
  }));

  return {
    crypto: processed,
    fiat: bitpayRates,
  };
}

export default {
  getAll,
};