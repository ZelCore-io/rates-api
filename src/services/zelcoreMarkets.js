const request = require('request-promise-native');
const config = require('config');
const apiKey = process.env.API_KEY || config.apiKey;

function apiRequest(url) {
  return request({ uri: url, json: true })
    .then((response) => {
      return response
    })
    .catch((error) => {
      console.log("ERROR: " + url)
      return error
    })
}

var zelcoreMarkets = {
  getAll() {
    return Promise.all([
     //  marketinfo cryptocompare
    ].concat(cryptoCompareIDs.map(async element => {
      return apiRequest(`https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${element}&tsyms=BTC&api_key=${apiKey}`)//
      //  marketinfo coingecko
    })).concat(coingeckoIDs.map(async element => { 
      return apiRequest(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=btc&ids=${element}&order=market_cap_desc&per_page=100&page=1&sparkline=false`)
    }))
    ).then((results) => {
      var markets = [];
      var cmk = {};
      var errors = { errors: {} }

      
      // full results from cryptocompare
      var dataCC = results.slice(0,cryptoCompareIDs.length);
      dataCC.forEach((subresult) => {
        var coinsFull = Object.keys(subresult.RAW) // full results from cryptocompare
        coinsFull.forEach((coin) => {
          try {
            var coindetail = {}
            coindetail['supply'] = subresult.RAW[coin].BTC.SUPPLY
            coindetail['volume'] = subresult.RAW[coin].BTC.TOTALVOLUME24HTO
            coindetail['change'] = subresult.RAW[coin].BTC.CHANGEPCT24HOUR
            coindetail['market'] = subresult.RAW[coin].BTC.MKTCAP
            cmk[coin] = coindetail
          } catch (e) {
            errors.errors.coinsFull = subresult
          }
        })
      })

      // full results from coingecko
      dataCG = results.slice(cryptoCompareIDs.length,cryptoCompareIDs.length + coingeckoIDs.length);
      dataCG.forEach((subresult) => {
        var coinsFull = Object.keys(subresult) 
        coinsFull.forEach((coin) => {
          try {
            var coindetail = {}
            coindetail['rank'] = subresult[coin].market_cap_rank
            coindetail['total_supply'] = subresult[coin].total_supply
            coindetail['supply'] = subresult[coin].circulating_supply
            coindetail['volume'] = subresult[coin].total_volume
            coindetail['change'] = subresult[coin].price_change_percentage_24h
            coindetail['market'] = subresult[coin].market_cap
            cmk[subresult[coin].symbol.toUpperCase()] = coindetail
          } catch (e) {
            errors.errors.coinsFull = subresult
          }
        })
      })

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
      cmk.MSRM = cmk.SRM;
      cmk.WSOL = cmk.SOL;

      markets.push(cmk);
      markets.push(errors);

      return markets;
    });
  },
};

module.exports = zelcoreMarkets;
