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

var zelcoreRates = {
  getAll() {
    return Promise.all([
      //  price
      apiRequest('https://min-api.cryptocompare.com/data/pricemulti?fsyms=TOK,CONI,PAX,GUSD,USDC,ETC,XMR,DASH,BTC,ETH,ZEC,USDT,LTC,BTCZ,RVN,BCH,BNB,BTX,SONM,OMG,ZIL,ZRX,GNT,SPHTX,BAT,MKR,KNC,ENG,PAY,SUB,CVC,STX,BTG,KCS,SRN,,EVX,FET,GTO,GVT,HOT,INS,IOTX,KEY,LUN,MDA,MITH,MTH,OAX,OST,PPT,QSP,REN,RLC,SNGLS,TNB,TNT,VIB,VIBE,WABI,WPR,DOCK,FUEL,CDT,CELR,CND,DATA,DGD,DLT,AGI&tsyms=BTC'),  //  0
      apiRequest('https://min-api.cryptocompare.com/data/pricemulti?fsyms=HUSH,ZCL,XSG,BTCP,ZEN,KMD,XZC,ZER,ABT,ADX,AE,AION,AST,BBO,APPC,BLZ,BNT,ETHOS,COFI,DAI,DGX,ELEC,ELF,ENJ,STORJ,IOST,DENT,LEND,LINK,MANA,LRC,QASH,ICN,MCO,MTL,POE,POLY,POWR,RCN,RDN,REQ,SNT,SALT,STORM,EDO,TUSD,DCN,WAX,WINGS,DTA,FUN,KIN,BSV,AOA,THETA,ADT,MFT,ATL,ANT,ARN,BRD,REP,QKC,LOOM,ANON,EURS,AMB,BCPT&tsyms=BTC'), //  1
      apiRequest('https://min-api.cryptocompare.com/data/pricemulti?fsyms=EOS,ADA,XRP,DOCK,NEO,TRON,BTT,SAFE,SUQA,BTH,GRS,ZEL&tsyms=BTC'),  //  2
      apiRequest('https://bitpay.com/api/rates'), //  3
      apiRequest('https://api.coingecko.com/api/v3/coins/markets?vs_currency=btc&ids=safe-coin-2&order=market_cap_desc&per_page=100&page=1&sparkline=false'),  // 4
      apiRequest('https://api.coingecko.com/api/v3/coins/markets?vs_currency=btc&ids=genesis-network&order=market_cap_desc&per_page=100&page=1&sparkline=false'), //  5
      apiRequest('https://api.coingecko.com/api/v3/coins/markets?vs_currency=btc&ids=bzedge&order=market_cap_desc&per_page=100&page=1&sparkline=false'),  // 6
      apiRequest('https://api.coingecko.com/api/v3/coins/markets?vs_currency=btc&ids=commercium&order=market_cap_desc&per_page=100&page=1&sparkline=false'), // 7
      apiRequest('https://api.coingecko.com/api/v3/coins/markets?vs_currency=btc&ids=bitcoin-zero&order=market_cap_desc&per_page=100&page=1&sparkline=false'), // 8

      
    ]).then((results) => {
      var rates = [];
      var efg = {};
      var errors = { errors: {} }
      var ccDataA = results[0]; // results from cryptocompare
      var ccDataB = results[1]; // results from cryptocompare
      var ccDataC = results[2]; // results from cryptocompare

      try {
        var dummyTest = results[3][1].code; // results from bitpay
        var bitpayData = results[3]
      } catch (e) {
        var bitpayData = -1
        errors.errors.bitPayData = results[3]
      }

      try {
        var safeprice = Number(results[4][0].current_price) // results from coingecko
        efg.SAFE = safeprice
      } catch (e) {
        errors.errors.SAFE = results[4]
      }
      try {
        var genxprice = Number(results[5][0].current_price) // results from coingecko
        efg.GENX = genxprice
      } catch (e) {
        errors.errors.GENX = results[5]
      }
      try {
        var bzeprice = Number(results[6][0].current_price) // results from coingecko
        efg.BZE = bzeprice
      } catch (e) {
        errors.errors.BZE = results[6]
      }
      try {
        var cmmprice = Number(results[7][0].current_price) // results from coingecko
        efg.CMM = cmmprice
      } catch (e) {
        errors.errors.CMM = results[7]
      }
      try {
        var bzxprice = Number(results[8][0].current_price) // results from coingecko
        efg.BZX = bzxprice
      } catch (e) {
        errors.errors.BZX = results[8]
      }

      var coinsA = Object.keys(ccDataA) // results from cryptocompare
      coinsA.forEach((coin) => {
        try {
          efg[coin] = ccDataA[coin].BTC
        } catch (e) {
          errors.errors.coinsA = results[0]
        }
      })

      var coinsB = Object.keys(ccDataB) // results from cryptocompare
      coinsB.forEach((coin) => {
        try {
          efg[coin] = ccDataB[coin].BTC
        } catch (e) {
          errors.errors.coinsB = results[1]
        }
      })

      var coinsC = Object.keys(ccDataC) // results from cryptocompare
      coinsC.forEach((coin) => {
        try {
          efg[coin] = ccDataC[coin].BTC
        } catch (e) {
          errors.errors.coinsB = results[2]
        }
      })

      // assets with zero value or no usable API
      efg.TESTZEL = 0
      efg.DIBI = 0
      efg.POR = 0
      efg.GUNTHY = 0

      rates.push(bitpayData);
      rates.push(efg);

      rates.push(errors);

      return rates;
    });
  },
};

module.exports = zelcoreRates;
