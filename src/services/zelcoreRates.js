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
      apiRequest('https://api.coinmarketcap.com/v1/ticker/safecoin/'),
      apiRequest('https://api.coingecko.com/api/v3/coins/markets?vs_currency=btc&ids=genesis-network&order=market_cap_desc&per_page=100&page=1&sparkline=false'),
      apiRequest('https://api.coingecko.com/api/v3/coins/markets?vs_currency=btc&ids=bzedge&order=market_cap_desc&per_page=100&page=1&sparkline=false'),
      apiRequest('https://api.coinmarketcap.com/v1/ticker/commercium/'),
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
      var ccDataFullA = results[9]; // Full results from cryptocompare -- Jefke
      var ccDataFullB = results[10]; // Full results from cryptocompare -- Jefke
      var ccDataFullC = results[11]; // Full results from cryptocompare -- Jefke

      try {
        var dummyTest = results[3][1].code; // results from bitpay
        var bitpayData = results[3]
      } catch (e) {
        var bitpayData = -1
        errors.errors.bitPayData = results[3]
      }

      try {
        var safeprice = Number(results[4][0].price_btc)
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
        var cmmprice = Number(results[7][0].price_btc)
        efg.CMM = cmmprice
      } catch (e) {
        errors.errors.CMM = results[7]
      }
      try {
        var bzxprice = Number(results[8][0].price_btc)
        efg.BZX = bzxprice
      } catch (e) {
        errors.errors.BZX = results[8]
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
          errors.errors.coinsFullA = results[9]
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
          errors.errors.coinsFullB = results[10]
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
        } catch (e) {
          errors.errors.coinsFullC = results[11]        }
      })

      efg.TESTZEL = 0
      efg.DIBI = 0
      efg.POR = 0
      efg.GUNTHY = 0

      rates.push(bitpayData);
      rates.push(efg);
      rates.push(cmk);

      rates.push(errors);

      return rates;
    });
  },
};

module.exports = zelcoreRates;
