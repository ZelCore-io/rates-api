const request = require('request-promise-native');
const config = require('config');
const apiKey = config.apiKey;

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
      apiRequest(`https://min-api.cryptocompare.com/data/pricemulti?fsyms=TOK,CONI,PAX,GUSD,USDC,ETC,XMR,DASH,BTC,ETH,ZEC,USDT,LTC,BTCZ,RVN,BCH,BNB,BTX,SONM,OMG,ZIL,ZRX,GNT,SPHTX,BAT,MKR,KNC,ENG,PAY,SUB,CVC,STX,BTG,KCS,SRN,,EVX,FET,GTO,GVT,INS,IOTX,KEY,LUN,MDA,MITH,MTH,OAX,OST,PPT,QSP,REN,RLC,SNGLS,TNB,TNT,VIB,VIBE,WABI,WPR,DOCK,FUEL,CDT,CELR,CND,DATA,DGD,DLT,AGI&tsyms=BTC&api_key=${apiKey}`),  //  1
      apiRequest(`https://min-api.cryptocompare.com/data/pricemulti?fsyms=HUSH,ZCL,XSG,BTCP,ZEN,KMD,XZC,ABT,ADX,AE,AION,AST,BBO,APPC,BLZ,BNT,ETHOS,COFI,DAI,DGX,ELEC,ELF,ENJ,STORJ,IOST,DENT,LEND,LINK,MANA,LRC,QASH,ICN,MCO,MTL,POE,POLY,POWR,RCN,RDN,REQ,SNT,SALT,STORM,EDO,TUSD,DCN,WAX,WINGS,DTA,FUN,KIN,BSV,AOA,THETA,ADT,MFT,ATL,ANT,ARN,BRD,REP,QKC,LOOM,ANON,EURS,AMB,BCPT&tsyms=BTC&api_key=${apiKey}`), //  2
      apiRequest(`https://min-api.cryptocompare.com/data/pricemulti?fsyms=QTUM,XEM,ONGAS,ONT,MIOTA,GAS,TRX,DGB,XLM,DOGE,EOS,ADA,XRP,DOCK,NEO,TRON,BTT,SAFE,BTH,GRS,XCASH,LEO,USDS,ENQ,FTM,0XBTC,AERGO,UBT,ILC,HEX,COMP,VIDT,DRGN,WBTC,OM,COIN,UNI&tsyms=BTC&api_key=${apiKey}`),  //  3
      apiRequest('https://api.coingecko.com/api/v3/coins/markets?vs_currency=btc&ids=zero,hotbit-token,binance-usd,huobi-pool-token,huobi-token,zb-token,mx-token,bitforex,okb,veriblock,dmme,suqa,holotoken,half-life,axe,safe-coin-2,genesis-network,bzedge,commercium,bitcoin-zero,zelcash,kadena,whale&order=market_cap_desc&per_page=100&page=1&sparkline=false'),  // 4
      apiRequest('https://api.coinpaprika.com/v1/ticker/golf-golfcoin'),  // 5
    ]).then((results) => {
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
      var coinsCG = Object.keys(results[4])
      coinsCG.forEach((index) => {
        try {
          efg[results[4][index].symbol.toUpperCase()] = results[4][index].current_price
        } catch (e) {
          errors.errors.coinsCG = results[4]
        }
      })

      // results from cryptocompare (prices)
      var dataCC = [results[1], results[2], results[3]]
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

      // results from coinpaprika (prices)
      try {
        efg.GOLF = Number(results[5].price_btc) || 0.00000001
      } catch (e) {
        errors.errors.GOLF = results[5]
      }

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


      rates.push(bitpayData);
      rates.push(efg);

      rates.push(errors);

      return rates;
    });
  },
};

module.exports = zelcoreRates;
