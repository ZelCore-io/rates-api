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

      //  marketinfo
      apiRequest('https://min-api.cryptocompare.com/data/pricemultifull?fsyms=TOK,CONI,PAX,GUSD,USDC,ETC,XMR,DASH,BTC,ETH,ZEC,USDT,LTC,BTCZ,RVN,BCH,BNB,BTX,SONM,OMG,ZIL,ZRX,GNT,SPHTX,BAT,MKR,KNC,ENG,PAY,SUB,CVC,STX,BTG,KCS,SRN,,EVX,FET,GTO,GVT,HOT,INS,IOTX,KEY,LUN,MDA,MITH,MTH,OAX,OST,PPT,QSP,REN,RLC,SNGLS,TNB,TNT,VIB,VIBE,WABI,WPR,DOCK,FUEL,CDT,CELR,CND,DATA,DGD,DLT,AGI&tsyms=BTC'),  //  9
      apiRequest('https://min-api.cryptocompare.com/data/pricemultifull?fsyms=HUSH,ZCL,XSG,BTCP,ZEN,KMD,XZC,ZER,ABT,ADX,AE,AION,AST,BBO,APPC,BLZ,BNT,ETHOS,COFI,DAI,DGX,ELEC,ELF,ENJ,STORJ,IOST,DENT,LEND,LINK,MANA,LRC,QASH,ICN,MCO,MTL,POE,POLY,POWR,RCN,RDN,REQ,SNT,SALT,STORM,EDO,TUSD,DCN,WAX,WINGS,DTA,FUN,KIN,BSV,AOA,THETA,ADT,MFT,ATL,ANT,ARN,BRD,REP,QKC,LOOM,ANON,EURS,AMB,BCPT&tsyms=BTC'), //  10
      apiRequest('https://min-api.cryptocompare.com/data/pricemultifull?fsyms=EOS,ADA,XRP,DOCK,NEO,TRON,BTT,SUQA,BTH,GRS,ZEL&tsyms=BTC'), // 11
      apiRequest('https://api.coingecko.com/api/v3/coins/markets?vs_currency=btc&ids=safe-coin-2&order=market_cap_desc&per_page=100&page=1&sparkline=false'), // 12
      apiRequest('https://api.coingecko.com/api/v3/coins/markets?vs_currency=btc&ids=genesis-network&order=market_cap_desc&per_page=100&page=1&sparkline=false'), // 13
      apiRequest('https://api.coingecko.com/api/v3/coins/markets?vs_currency=btc&ids=bzedge&order=market_cap_desc&per_page=100&page=1&sparkline=false'),  // 14
      apiRequest('https://api.coingecko.com/api/v3/coins/markets?vs_currency=btc&ids=commercium&order=market_cap_desc&per_page=100&page=1&sparkline=false'),  //  15
      apiRequest('https://api.coingecko.com/api/v3/coins/markets?vs_currency=btc&ids=bitcoin-zero&order=market_cap_desc&per_page=100&page=1&sparkline=false'),  //  16

      
    ]).then((results) => {
      var rates = [];
      var efg = {};
      var cmk = {};
      var errors = { errors: {} }
      var ccDataA = results[0]; // results from cryptocompare
      var ccDataB = results[1]; // results from cryptocompare
      var ccDataC = results[2]; // results from cryptocompare

      //marketcap Data
      var ccDataFullA = results[9]; // full results from cryptocompare
      var ccDataFullB = results[10]; // full results from cryptocompare
      var ccDataFullC = results[11]; // full results from cryptocompare
      var ccDataFullD = results[12]; // full results from cmc for SAFE
      var ccDataFullE = results[13]; // full results from coingecko for GENX
      var ccDataFullF = results[14]; // full results from coingecko for BZE
      var ccDataFullG = results[15]; // full results from cmc for CMM
      var ccDataFullH = results[16]; // full results from coingecko for BZX

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
      
      // adding full data to the json file

      var coinsFullA = Object.keys(ccDataFullA.RAW) // full results from cryptocompare
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

      var coinsFullB = Object.keys(ccDataFullB.RAW) // full results from cryptocompare
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

      var coinsFullC = Object.keys(ccDataFullC.RAW) // full results from cryptocompare
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
          errors.errors.coinsFullC = results[11]        
        }
      })

      var coinsFullD = Object.keys(ccDataFullD) // full results from coingecko
      coinsFullD.forEach((coin) => {
        try {
          var coindetail ={}
          coindetail['current_price'] = ccDataFullD[coin].BTC.current_price
          coindetail['circulating_supply'] = ccDataFullD[coin].BTC.circulating_supply
          coindetail['total_volume'] = ccDataFullD[coin].BTC.total_volume
          coindetail['price_change_percentage_24h'] = ccDataFullD[coin].BTC.price_change_percentage_24h
          coindetail['market_cap'] = ccDataFullD[coin].BTC.market_cap
          cmk[coin] = coindetail
        } catch (e) {
          errors.errors.coinsFullD = results[12]        
        }
      })

      // assets with zero value or no usable API
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
