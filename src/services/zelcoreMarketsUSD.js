const request = require('request-promise-native');
const config = require('config');
const { cryptoCompareIDs, coingeckoIDs } = require('./coinAggregatorIDs');

const apiKey = process.env.API_KEY || config.apiKey;

function apiRequest(url) {
  return request({ uri: url, json: true })
    .then((response) => response)
    .catch((error) => {
      console.log(`ERROR: ${url}`);
      return error;
    });
}

const zelcoreMarkets = {
  getAll() {
    return Promise.all([
      // cryptocompare
      ...cryptoCompareIDs.map((elementGroup) => apiRequest(`https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${elementGroup}&tsyms=USD&api_key=${apiKey}`)),
      // coingecko
      ...coingeckoIDs.map((elementGroup) => apiRequest(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${elementGroup}&order=market_cap_desc&per_page=100&page=1&sparkline=false`)),
    ])
      .then((results) => {
        const markets = [];
        const cmk = {};
        const errors = { errors: {} };

        // full results from cryptocompare
        const dataCC = results.slice(0, cryptoCompareIDs.length);
        dataCC.forEach((subresult) => {
          try {
            const coinsFull = Object.keys(subresult.RAW);
            coinsFull.forEach((coin) => {
              const coindetail = {};
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
              const coindetail = {};
              coindetail.rank = subresult[coin].market_cap_rank;
              coindetail.total_supply = subresult[coin].total_supply;
              coindetail.supply = subresult[coin].circulating_supply;
              coindetail.volume = subresult[coin].total_volume;
              coindetail.change = subresult[coin].price_change_percentage_24h;
              coindetail.market = subresult[coin].market_cap;
              cmk[subresult[coin].symbol.toUpperCase()] = coindetail;
            });
          } catch (e) {
            errors.errors.coinsFull = subresult;
          }
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
        cmk.MSRM = cmk.SRM;
        cmk.WSOL = cmk.SOL;
        cmk.WETH = cmk.ETH;

        markets.push(cmk);
        markets.push(errors);

        return markets;
      });
  },
};

module.exports = zelcoreMarkets;
