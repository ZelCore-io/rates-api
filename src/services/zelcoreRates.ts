import { coinAggregatorIDs } from './coinAggregatorIDs';
import * as log from '../lib/log';
import { CoinGecko, CryptoCompare, BitPay, LiveCoinWatch } from './providers';
import {
  ICurrencyRate,
  RatesData,
  CodeRates,
  CoinGeckoPrice,
  LiveCoinWatchMarket,
} from '../types';

/**
 * Fetches exchange rates and price data from various providers and aggregates them.
 *
 * This function retrieves fiat rates from BitPay and cryptocurrency prices from CoinGecko,
 * CryptoCompare, and LiveCoinWatch. It handles errors gracefully and returns an aggregated
 * `RatesData` object containing the data and any errors that occurred.
 *
 * @async
 * @returns {Promise<RatesData>} The aggregated rates data.
 *
 * @example
 * ```typescript
 * import { getAll } from './zelcoreRates';
 *
 * async function fetchRates() {
 *   const rates = await getAll();
 *   console.log('Rates Data:', rates);
 * }
 *
 * fetchRates();
 * ```
 */
export async function getAll(): Promise<RatesData> {
  const rates: RatesData = [[], {}, { errors: {} }];
  const efg: CodeRates = {};
  let bitpayData: ICurrencyRate[] = [{ code: 'USD', name: 'US Dollar', rate: 22000 }];
  const errors: { errors: Record<string, any> } = { errors: {} };

  // Fetch fiat rates from BitPay
  try {
    const bitpay = await BitPay.getInstance().getFiatRates();

    if (!bitpay[1]?.code) {
      throw new Error('BitPay did not return expected data');
    }
    bitpayData = bitpay;
  } catch (e) {
    log.error('BitPay error');
    log.error(e);
    errors.errors.bitpay = true;
  }

  // Fetch cryptocurrency prices from CoinGecko
  try {
    const coingecko = await CoinGecko.getInstance().getExchangeRates(coinAggregatorIDs.coingecko);

    coingecko.forEach((value: CoinGeckoPrice) => {
      efg[value.symbol.toUpperCase()] = value.current_price;
    });
  } catch (e) {
    log.error('CoinGecko error');
    log.error(e);
    errors.errors.coingecko = true;
  }

  // Fetch cryptocurrency prices from CryptoCompare
  try {
    const cryptocompare = await CryptoCompare.getInstance().getExchangeRates(coinAggregatorIDs.cryptoCompare);

    const coinsCC = Object.keys(cryptocompare);
    coinsCC.forEach((coin) => {
      efg[coin] = cryptocompare[coin].BTC;
    });
  } catch (e) {
    log.error('CryptoCompare error');
    log.error(e);
    errors.errors.cryptocompare = true;
  }

  // Fetch cryptocurrency prices from LiveCoinWatch
  try {
    const livecoinwatch = await LiveCoinWatch.getInstance().getExchangeRates(coinAggregatorIDs.livecoinwatch);

    livecoinwatch.forEach((coin: LiveCoinWatchMarket) => {
      efg[coin.code] = coin.rate;
    });
  } catch (e) {
    log.error('LiveCoinWatch error');
    log.error(e);
    errors.errors.livecoinwatch = true;
  }

  // Handle assets with zero value or no usable API
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
  efg.MSRM = (efg.SRM || 0) * 1_000_000;
  efg.WSOL = efg.SOL;
  efg.WETH = efg.ETH;
  efg.WMATIC = efg.MATIC;
  efg.kFRAX = efg.FRAX;
  efg.GLINK = efg.TENT;
  efg.BABE = (efg.KDA || 0) / 4.2;
  efg.KDX = (efg.KDA || 0) / 28;
  efg.SKDX = (efg.KDA || 0) / 28;
  efg.MOK = (efg.KDA || 0) / 125;
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
