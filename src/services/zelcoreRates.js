const request = require('request-promise-native');
const config = require('config');
const apiKey = process.env.API_KEY || config.apiKey;
const {cryptoCompareIDs,coingeckoIDs} = require('./coinAggregatorIDs');

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

var zelcoreRates = {
  getAll() {
    return Promise.all([
      // fiat rates
      apiRequest('https://bitpay.com/rates/BTC'), //  0
      //  crypto prices
    ].concat(cryptoCompareIDs.map(async element => {
      return apiRequest(`https://min-api.cryptocompare.com/data/pricemulti?fsyms=${element}&tsyms=BTC&api_key=${apiKey}`)//
    })).concat(coingeckoIDs.map(async element => { 
      return apiRequest(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=btc&ids=${element}&order=market_cap_desc&per_page=100&page=1&sparkline=false`)
    }))
    ).then((results) => {
      var rates = [];
      
      var efg = {};
      var errors = { errors: {} }
      // results from bitpay (fiat rates)
      try {
        console.log(results[0])
        var dummyTest = results[0].data[1].code;
        console.log(dummyTest)
        if (dummyTest == undefined) throw new Error("Bitpay does not work correctly")
        var bitpayData = results[0].data;
      } catch (e) {
        var bitpayData = [{ code: "USD", rate: 10000 }];
        errors.errors.bitPayData = results[0].data
      }

      // results from coingecko (prices)
      dataCG = results.slice(1+cryptoCompareIDs.length,1 + cryptoCompareIDs.length + coingeckoIDs.length);
      dataCG.forEach((subresult) => {
        var coinsCG = Object.keys(subresult)
        coinsCG.forEach((index) => {
          try {
            efg[subresult[index].symbol.toUpperCase()] = subresult[index].current_price;
          } catch (e) {
            errors.errors.coinsCG = subresult;
          }
        })
      })

      // results from cryptocompare (prices)
      var dataCC = results.slice(1,1+cryptoCompareIDs.length);
      dataCC.forEach((subresult) => {
        var coinsCC = Object.keys(subresult)
        coinsCC.forEach((coin) => {
          try {
            efg[coin] = subresult[coin].BTC
          } catch (e) {
            errors.errors.coinsCC = subresult
          }
        })
      })
      
      // assets with zero value or no usable API
      efg.TESTZEL = 0
      efg.DIBI = 0
      efg.POR = 0
      efg.GUNTHY = 0
      efg.BXY = 0.00001249
      efg.FISH = 0
      efg.GCBEST = efg.USDT
      efg.GCHD = efg.USDT
      efg.GCLOWE = efg.USDT
      efg.GCSTAR = efg.USDT
      efg.GCTGT = efg.USDT
      efg.GCSWAL = efg.USDT
      efg.ONG = efg.ONGAS
      efg.SAI = efg.DAI
      efg.WBNB = efg.BNB
      efg.ARN = efg.ARNX
      efg.ZEL = efg.FLUX;
      efg['FLUX-KDA'] = efg.FLUX;
      efg['FLUX-ETH'] = efg.FLUX;
      efg['FLUX-BNB'] = efg.FLUX;
      efg['FLUX-TRX'] = efg.FLUX;
      efg['FLUX-BSC'] = efg.FLUX;
      efg.TESTWND = 0;
      efg.TESTBTC = 0;
      efg.TESTETH = 0;
      efg.MSRM = efg.SRM * 1000000;
      efg.WSOL = efg.SOL;


      rates.push(bitpayData);
      rates.push(efg);

      rates.push(errors);

      return rates;
    });
  },
};

module.exports = zelcoreRates;
