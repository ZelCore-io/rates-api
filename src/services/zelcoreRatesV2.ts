import { coinAggregatorIDs } from './coinAggregatorIDs';
import * as log from '../lib/log';
import { CoinGecko, BitPay, CryptoCompare, LiveCoinWatch } from './providers';
import { getBstockPrices, isBstocksDegraded, getLastGoodBstockPrices } from './bstocks';
import { PricesResponse, CryptoPrice, ICurrencyRate } from '../types';

/**
 * Resolves after `ms` milliseconds, ignoring the value it's chained onto.
 * Used to bound the bStocks fetch below: a total Binance outage can otherwise
 * cost a single refresh cycle up to ~92s (the AxiosWrapper retry budget spent
 * across `getTokenisedAssets`, `getTradingSymbols`, and both ticker windows),
 * which would stall the refresh of all 364 non-bStock assets behind it.
 *
 * `Promise.race` never cancels the losing branch, so on the normal/healthy
 * path (`getBstockPrices()` wins well under 10s) this timer is still live in
 * the background for whatever remains of the 10s -- `.unref()` keeps it from
 * holding the process open for that tail, since nothing depends on it firing.
 *
 * @param ms - Milliseconds to wait.
 */
function timeout(ms: number): Promise<void> {
  return new Promise((resolve) => { setTimeout(resolve, ms).unref(); });
}

/**
 * Fetches and aggregates cryptocurrency prices and fiat rates from multiple providers.
 *
 * This function retrieves fiat rates from BitPay and cryptocurrency prices from CoinGecko,
 * CryptoCompare, and LiveCoinWatch. It handles errors from each provider and compiles the data
 * into a unified `PricesResponse` object.
 *
 * @async
 * @returns {Promise<PricesResponse>} An object containing crypto prices, fiat rates, and any errors encountered.
 *
 * @example
 * ```typescript
 * import zelcoreRatesV2 from './zelcoreRatesV2';
 *
 * async function fetchPrices() {
 *   const prices = await zelcoreRatesV2.getAll();
 *   console.log('Prices:', prices);
 * }
 *
 * fetchPrices();
 * ```
 */
export async function getAll(): Promise<PricesResponse> {
  const processed: CryptoPrice[] = [];
  const fiat: ICurrencyRate[] = [];
  const errors: Record<string, any> = {};

  // Fetch fiat rates from BitPay
  try {
    const bitpayRates = await BitPay.getInstance().getFiatRates();
    if (!bitpayRates[1]?.code) {
      throw new Error('BitPay did not return expected data');
    }
    fiat.push(...bitpayRates);
  } catch (e) {
    log.error('BitPay error');
    log.error(e);
    errors.bitpay = true;
  }

  // Fetch cryptocurrency prices from CoinGecko
  try {
    const coingecko = await CoinGecko.getInstance().getExchangeRates(coinAggregatorIDs.coingecko);
    const coingeckoUsd = await CoinGecko.getInstance().getExchangeRates(coinAggregatorIDs.coingecko, 'usd');
    processed.push(...coingeckoUsd.map((coin) => {
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
        change7d: coin.price_change_percentage_7d_in_currency,
      };
    }));
  } catch (e) {
    log.error('CoinGecko error');
    log.error(e);
    errors.coingecko = true;
  }

  // Fetch cryptocurrency prices from CryptoCompare
  try {
    const cryptocompare = await CryptoCompare.getInstance().getMarketData(coinAggregatorIDs.cryptoCompare);
    const cryptocompareUsd = await CryptoCompare.getInstance().getMarketData(coinAggregatorIDs.cryptoCompare, 'USD');

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
      };
    }));
  } catch (e) {
    log.error('CryptoCompare error');
    log.error(e);
    errors.cryptocompare = true;
  }

  // Fetch cryptocurrency prices from LiveCoinWatch
  try {
    const livecoinwatch = await LiveCoinWatch.getInstance().getExchangeRates(coinAggregatorIDs.livecoinwatch);
    const livecoinwatchUsd = await LiveCoinWatch.getInstance().getExchangeRates(coinAggregatorIDs.livecoinwatch, 'USD');

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
      };
    }));
  } catch (e) {
    log.error('LiveCoinWatch error');
    log.error(e);
    errors.livecoinwatch = true;
  }

  // Fetch bStock prices from Binance. Bounded to 10s so a hung/slow Binance
  // outage cannot stall the refresh of every other provider behind it.
  //
  // Losing the race must NOT resolve to []. bStock rows carry
  // provider: 'coingecko' while their failure is reported under
  // errors.binance, so the provider carry-forward in apiServices can never
  // protect them -- an empty result would drop every bStock from /v2/rates
  // and the wallet would show them at $0 with no error banner. Serve the
  // last-known-good snapshot instead, and flag the cycle as degraded, since
  // the timeout branch leaves freshPricedLastRun reflecting a previous run.
  let raceLost = false;
  try {
    const bstocks = await Promise.race([
      getBstockPrices(),
      timeout(10_000).then((): CryptoPrice[] => {
        raceLost = true;
        return getLastGoodBstockPrices();
      }),
    ]);
    processed.push(...bstocks);
    // getBstockPrices() never rejects -- every failure inside it is caught
    // internally -- so a total Binance outage looks identical to a healthy
    // refresh unless we ask it directly whether it degraded this cycle.
    if (raceLost || isBstocksDegraded()) {
      errors.binance = true;
    }
  } catch (e) {
    log.error('bStocks error');
    log.error(e);
    errors.binance = true;
  }

  return {
    crypto: processed,
    fiat,
    errors,
  };
}

export default {
  getAll,
};
