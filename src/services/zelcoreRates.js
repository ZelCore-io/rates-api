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
      //price   
      apiRequest('https://min-api.cryptocompare.com/data/pricemulti?fsyms=TOK,CONI,PAX,GUSD,USDC,ETC,XMR,DASH,BTC,ETH,ZEC,USDT,LTC,BTCZ,RVN,BCH,BNB,BTX,SONM,OMG,ZIL,ZRX,GNT,SPHTX,BAT,MKR,KNC,ENG,PAY,SUB,CVC,STX,BTG,KCS,SRN,,EVX,FET,GTO,GVT,HOT,INS,IOTX,KEY,LUN,MDA,MITH,MTH,OAX,OST,PPT,QSP,REN,RLC,SNGLS,TNB,TNT,VIB,VIBE,WABI,WPR,DOCK,FUEL,CDT,CELR,CND,DATA,DGD,DLT,AGI&tsyms=BTC'),
      apiRequest('https://min-api.cryptocompare.com/data/pricemulti?fsyms=HUSH,ZCL,XSG,BTCP,ZEN,KMD,XZC,ZER,ABT,ADX,AE,AION,AST,BBO,APPC,BLZ,BNT,ETHOS,COFI,DAI,DGX,ELEC,ELF,ENJ,STORJ,IOST,DENT,LEND,LINK,MANA,LRC,QASH,ICN,MCO,MTL,POE,POLY,POWR,RCN,RDN,REQ,SNT,SALT,STORM,EDO,TUSD,DCN,WAX,WINGS,DTA,FUN,KIN,BSV,AOA,THETA,ADT,MFT,ATL,ANT,ARN,BRD,REP,QKC,LOOM,ANON,EURS,AMB,BCPT&tsyms=BTC'),
      apiRequest('https://min-api.cryptocompare.com/data/pricemulti?fsyms=EOS,ADA,XRP,DOCK,NEO,TRON,BTT,SAFE,SUQA,BTH,GRS,ZEL&tsyms=BTC'),
      apiRequest('https://bitpay.com/api/rates'),
      apiRequest('https://www.worldcoinindex.com/apiservice/ticker?key=pZURzUjb0QFbY9knkicp3rrOqwYdwn&label=safebtc&fiat=btc'),
      // apiRequest('https://api.coinmarketcap.com/v1/ticker/zelcash/'),
      // apiRequest('https://api.coinmarketcap.com/v1/ticker/suqa/'),
      apiRequest('https://tradesatoshi.com/api/public/getticker?market=GENX_BTC'),
      apiRequest('https://api.crex24.com/v2/public/tickers?instrument=BZE-BTC'),
      apiRequest('https://coinlib.io/api/v1/coin?key=c01488b7aacd78a0&pref=BTC&symbol=POR'),
      // apiRequest('https://api.instantbitex.com/customticker/BTH_BTC'),
      apiRequest('https://api.coinmarketcap.com/v1/ticker/commercium/'),
      //apiRequest('https://api.coinmarketcap.com/v1/ticker/groestlcoin/'),
      apiRequest('https://openapi.idax.pro/api/v2/ticker?pair=GUNTHY_BTC'),
      apiRequest('https://api.coinmarketcap.com/v1/ticker/bitcoin-zero/'),

      //marketcap Pull -- Jefke
      apiRequest('https://min-api.cryptocompare.com/data/pricemultifull?fsyms=TOK,CONI,PAX,GUSD,USDC,ETC,XMR,DASH,BTC,ETH,ZEC,USDT,LTC,BTCZ,RVN,BCH,BNB,BTX,SONM,OMG,ZIL,ZRX,GNT,SPHTX,BAT,MKR,KNC,ENG,PAY,SUB,CVC,STX,BTG,KCS,SRN,,EVX,FET,GTO,GVT,HOT,INS,IOTX,KEY,LUN,MDA,MITH,MTH,OAX,OST,PPT,QSP,REN,RLC,SNGLS,TNB,TNT,VIB,VIBE,WABI,WPR,DOCK,FUEL,CDT,CELR,CND,DATA,DGD,DLT,AGI&tsyms=BTC'),
      apiRequest('https://min-api.cryptocompare.com/data/pricemultifull?fsyms=HUSH,ZCL,XSG,BTCP,ZEN,KMD,XZC,ZER,ABT,ADX,AE,AION,AST,BBO,APPC,BLZ,BNT,ETHOS,COFI,DAI,DGX,ELEC,ELF,ENJ,STORJ,IOST,DENT,LEND,LINK,MANA,LRC,QASH,ICN,MCO,MTL,POE,POLY,POWR,RCN,RDN,REQ,SNT,SALT,STORM,EDO,TUSD,DCN,WAX,WINGS,DTA,FUN,KIN,BSV,AOA,THETA,ADT,MFT,ATL,ANT,ARN,BRD,REP,QKC,LOOM,ANON,EURS,AMB,BCPT&tsyms=BTC'),
      apiRequest('https://min-api.cryptocompare.com/data/pricemultifull?fsyms=EOS,ADA,XRP,DOCK,NEO,TRON,BTT,SAFE,SUQA,BTH,GRS,ZEL&tsyms=BTC'),


      
    ]).then((results) => {
      var rates = [];
      var efg = {};
      var cmk = {};
      var errors = { errors: {} }
      var ccDataA = results[0]; // results from cryptocompare
      var ccDataB = results[1]; // results from cryptocompare
      var ccDataC = results[2]; // results from cryptocompare

      //marketcap Data
      var ccDataFullA = results[11]; // Full results from cryptocompare -- Jefke
      var ccDataFullB = results[12]; // Full results from cryptocompare -- Jefke
      var ccDataFullC = results[13]; // Full results from cryptocompare -- Jefke

      try {
        var dummyTest = results[3][1].code; // results from bitpay
        var bitpayData = results[3]
      } catch (e) {
        var bitpayData = -1
        errors.errors.bitPayData = results[3]
      }

      try {
        var safeprice = results[4].Markets[0].Price
        efg.SAFE = safeprice
      } catch (e) {
        errors.errors.SAFE = results[4]
      }
      try {
        var genxprice = results[5].result.last
        efg.GENX = genxprice
      } catch (e) {
        errors.errors.GENX = results[5]
      }
      try {
        var bzeprice = results[6][0].last
        efg.BZE = bzeprice
      } catch (e) {
        errors.errors.BZE = results[6]
      }
      try {
        var porprice = Number(results[7].price)
        efg.POR = porprice
      } catch (e) {
        errors.errors.POR = results[7]
      }
      try {
        var cmmprice = Number(results[8][0].price_btc)
        efg.CMM = cmmprice
      } catch (e) {
        errors.errors.CMM = results[8]
      }
      try {
        var gunthyprice = Number(results[9].ticker[0].last)
        efg.GUNTHY = gunthyprice
      } catch (e) {
        errors.errors.GUNTHY = results[9]
      }
      try {
        var bzxprice = Number(results[10][0].price_btc)
        efg.BZX = bzxprice
      } catch (e) {
        errors.errors.BZX = results[10]
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

      var coinsC = Object.keys(ccDataC)
      coinsC.forEach((coin) => {
        try {
          efg[coin] = ccDataC[coin].BTC
        } catch (e) {
          errors.errors.coinsB = results[2]
        }
      })
      
      // --- Adding full data to the json file -- Jefke

      var coinsFullA = Object.keys(ccDataFullA.RAW)
      coinsFullA.forEach((coin) => {
        try {
          var coindetail ={}
          coindetail['PRICE'] = ccDataFullA.RAW[coin].BTC.PRICE
          coindetail['SUPPLY'] = ccDataFullA.RAW[coin].BTC.SUPPLY
          coindetail['TOTALVOLUME24H'] = ccDataFullA.RAW[coin].BTC.TOTALVOLUME24H
          coindetail['CHANGEPCT24HOUR'] = ccDataFullA.RAW[coin].BTC.CHANGEPCT24HOUR
          coindetail['MKTCAP'] = ccDataFullA.RAW[coin].BTC.MKTCAP
          cmk[coin] = coindetail
        } catch (e) {
          errors.errors.coinsFullA = results[11]
        }
      })

      var coinsFullB = Object.keys(ccDataFullB.RAW)
      coinsFullB.forEach((coin) => {
        try {
          var coindetail ={}
          coindetail['PRICE'] = ccDataFullB.RAW[coin].BTC.PRICE
          coindetail['SUPPLY'] = ccDataFullB.RAW[coin].BTC.SUPPLY
          coindetail['TOTALVOLUME24H'] = ccDataFullB.RAW[coin].BTC.TOTALVOLUME24H
          coindetail['CHANGEPCT24HOUR'] = ccDataFullB.RAW[coin].BTC.CHANGEPCT24HOUR
          coindetail['MKTCAP'] = ccDataFullB.RAW[coin].BTC.MKTCAP
          cmk[coin] = coindetail
        } catch (e) {
          errors.errors.coinsFullB = results[12]
        }
      })

      var coinsFullC = Object.keys(ccDataFullC.RAW)
      coinsFullC.forEach((coin) => {
        try {
          var coindetail ={}
          coindetail['PRICE'] = ccDataFullC.RAW[coin].BTC.PRICE
          coindetail['SUPPLY'] = ccDataFullC.RAW[coin].BTC.SUPPLY
          coindetail['TOTALVOLUME24H'] = ccDataFullC.RAW[coin].BTC.TOTALVOLUME24H
          coindetail['CHANGEPCT24HOUR'] = ccDataFullC.RAW[coin].BTC.CHANGEPCT24HOUR
          coindetail['MKTCAP'] = ccDataFullC.RAW[coin].BTC.MKTCAP
          cmk[coin] = coindetail
          //price
          //supply
          //totalvolume24h
          //mktcap

        } catch (e) {
          errors.errors.coinsFullC = results[13]        }
      })

      efg.TESTZEL = 0
      efg.DIBI = 0

      rates.push(bitpayData);
      rates.push(efg);
      rates.push(cmk);

      rates.push(errors);

      return rates;
    });
  },
};

module.exports = zelcoreRates;
