import { coinAggregatorIDs } from './coinAggregatorIDs';
import * as log from '../lib/log';
import { CoinGecko, CryptoCompare, BitPay, LiveCoinWatch } from './providers';


export async function getAll(): Promise<any[]> {
  const results: any[] = [];

  const cc = CryptoCompare.getInstance();
  const cg = CoinGecko.getInstance();
  const bp = BitPay.getInstance();
  const lcw = LiveCoinWatch.getInstance();
  const bitpay = await bp.getFiatRates();
  const cryptocompare = await cc.getExchangeRates(coinAggregatorIDs.cryptoCompare);
  const coingecko = await cg.getExchangeRates(coinAggregatorIDs.coingecko);
  const livecoinwatch = await lcw.getExchangeRates(coinAggregatorIDs.livecoinwatch);

  const rates: any[] = [];
  const efg: Record<string, any> = {};
  let bitpayData: any[] = [{ code: 'USD', rate: 22000 }];
  const errors: { errors: Record<string, any> } = { errors: {} };

  // results from bitpay (fiat rates)
  try {
    const dummyTest = bitpay[1].code;
    if (!dummyTest) {
      throw new Error('Bitpay does not work correctly');
    }
    bitpayData = bitpay;
  } catch (e) {
    errors.errors.bitPayData = bitpay;
  }

  // results from coingecko (prices)
  try {
    coingecko.forEach((value: any) => {
      efg[value.symbol.toUpperCase()] = value.current_price;
    });
  } catch (e) {
    errors.errors.coinsCG = coingecko;
  }

  // results from cryptocompare (prices)
  try {
    const coinsCC = Object.keys(cryptocompare);
    coinsCC.forEach((coin) => {
      efg[coin] = cryptocompare[coin].BTC;
    });
  } catch (e) {
    errors.errors.coinsCC = cryptocompare;
  }

  Object.values(livecoinwatch).forEach((coin: any) => {
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
