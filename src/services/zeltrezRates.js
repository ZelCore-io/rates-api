const request = require('request-promise-native');

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

var zeltrezRates = {
  getAll() {
    return Promise.all([
      apiRequest('https://min-api.cryptocompare.com/data/pricemulti?fsyms=TOK,CONI,PAX,GUSD,USDC,ETC,XMR,DASH,BTC,ETH,ZEC,USDT,LTC,BTCZ,RVN,BCH,BNB,BTX,SONM,OMG,ZIL,ZRX,GNT,SPHTX,BAT,MKR,KNC,ENG,PAY,SUB,CVC,STX,BTG,KCS,SRN&tsyms=BTC'),
      apiRequest('https://min-api.cryptocompare.com/data/pricemulti?fsyms=HUSH,ZCL,XSG,BTCP,ZEN,KMD,XZC,ZER,ABT,ADX,AE,AION,AST,BBO,APPC,BLZ,BNT,ETHOS,COFI,DAI,DGX,ELEC,ELF,ENJ,STORJ,IOST,DENT,LEND,LINK,MANA,LRC,QASH,ICN,MCO,MTL,POE,POLY,POWR,RCN,RDN,REQ,SNT,SALT,STORM,EDO,TUSD,DCN,WAX,WINGS,DTA,FUN,KIN,BSV,AOA,THETA,ADT,MFT,ATL,ANT,ARN,BRD,REP,QKC,LOOM,ANON&tsyms=BTC'),
      apiRequest('https://bitpay.com/api/rates'),
      apiRequest('https://www.worldcoinindex.com/apiservice/ticker?key=pZURzUjb0QFbY9knkicp3rrOqwYdwn&label=safebtc&fiat=btc'),
      apiRequest('https://api.coinmarketcap.com/v1/ticker/zelcash/'),
      apiRequest('https://api.coinmarketcap.com/v1/ticker/suqa/'),
      apiRequest('https://tradesatoshi.com/api/public/getticker?market=GENX_BTC'),
      apiRequest('https://api.crex24.com/v2/public/tickers?instrument=BZE-BTC'),
      apiRequest('https://coinlib.io/api/v1/coin?key=38bc7ea5cf2b6231&pref=BTC&symbol=POR')
    ]).then((results) => {
      var rates = [];
      var efg = {};
      var errors = { errors: {} }
      var ccDataA = results[0]; // results from cryptocompare
      var ccDataB = results[1]; // results from cryptocompare
      try {
        var dummyTest = results[2][1].code; // results from bitpay
        var bitpayData = results[2]
      } catch (e) {
        var bitpayData = -1
        errors.errors.bitPayData = results[2]
      }

      try {
        var safeprice = results[3].Markets[0].Price
        efg.SAFE = safeprice
      } catch (e) {
        errors.errors.SAFE = results[3]
      }
      try {
        var zelprice = Number(results[4][0].price_btc)
        efg.ZEL = zelprice
      } catch (e) {
        errors.errors.ZEL = results[4]
      }
      try {
        var suqaprice = Number(results[5][0].price_btc)
        efg.SUQA = suqaprice
      } catch (e) {
        errors.errors.suqa = results[5]
      }
      try {
        var genxprice = results[6].result.last
        efg.GENX = genxprice
      } catch (e) {
        errors.errors.GENX = results[6]
      }
      try {
        var bzeprice = results[7][0].last
        efg.BZE = bzeprice
      } catch (e) {
        errors.errors.BZE = results[7]
      }
      try {
        var eztest = results[8].markets[0].symbol
        var porprice = Number(results[8].price)
        efg.POR = porprice
      } catch (e) {
        errors.errors.POR = results[8]
      }

      var coinsA = Object.keys(ccDataA)
      coinsA.forEach((coin) => {
        try {
          efg[coin] = ccDataA[coin].BTC
        } catch (e) {
          errors.errors.coinsA = results[0]
        }
      })

      var coinsB = Object.keys(ccDataB)
      coinsB.forEach((coin) => {
        try {
          efg[coin] = ccDataB[coin].BTC
        } catch (e) {
          errors.errors.coinsB = results[1]
        }
      })

      rates.push(bitpayData);
      rates.push(efg);

      rates.push(errors);

      return rates;
    });
  },
};

module.exports = zeltrezRates;
