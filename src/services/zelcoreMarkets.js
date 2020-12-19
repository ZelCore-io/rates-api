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
      //  marketinfo
      apiRequest(`https://min-api.cryptocompare.com/data/pricemultifull?fsyms=TOK,CONI,PAX,GUSD,USDC,ETC,XMR,DASH,BTC,ETH,ZEC,USDT,LTC,BTCZ,RVN,BCH,BNB,BTX,SONM,OMG,ZIL,ZRX,GNT,SPHTX,BAT,MKR,KNC,ENG,PAY,SUB,CVC,STX,BTG,KCS,SRN,EVX,GTO,GVT,INS,IOTX,KEY,LUN,MDA,MITH,MTH,OAX,OST,PPT,QSP,REN,RLC,SNGLS,TNB,TNT,VIB,VIBE,WABI,WPR,DOCK,FUEL,CDT,CELR,CND,DATA,DGD,DLT,AGI&tsyms=BTC&api_key=${apiKey}`),  //  0
      apiRequest(`https://min-api.cryptocompare.com/data/pricemultifull?fsyms=HUSH,ZCL,XSG,BTCP,ZEN,KMD,XZC,ABT,ADX,AE,AION,AST,BBO,APPC,BLZ,BNT,ETHOS,COFI,DAI,DGX,ELEC,ELF,ENJ,STORJ,IOST,DENT,LEND,LINK,MANA,LRC,QASH,ICN,MCO,MTL,POE,POLY,POWR,RCN,REQ,SNT,SALT,STORM,EDO,TUSD,DCN,WAX,WINGS,DTA,FUN,KIN,BSV,AOA,THETA,ADT,MFT,ATL,ANT,ARN,BRD,REP,QKC,LOOM,ANON,EURS,AMB,BCPT&tsyms=BTC&api_key=${apiKey}`), //  1
      apiRequest(`https://min-api.cryptocompare.com/data/pricemultifull?fsyms=QTUM,XEM,ONGAS,ONT,MIOTA,GAS,TRX,DGB,XLM,DOGE,EOS,ADA,XRP,DOCK,NEO,BTT,GRS,XCASH,LEO,USDS,ENQ,FTM,0XBTC,AERGO,UBT,ILC,HEX,COMP,VIDT,DRGN,WBTC,OM,UNI,JST,BDX,FIRO&tsyms=BTC&api_key=${apiKey}`), // 2
      // marketinfo CoinGecko
      apiRequest('https://api.coingecko.com/api/v3/coins/markets?vs_currency=btc&ids=zero,hotbit-token,binance-usd,huobi-pool-token,huobi-token,zb-token,mx-token,bitforex,okb,veriblock,dmme,suqa,holotoken,half-life,axe,zencash,adex,fetch-ai,bitcoin-private,hush,raiden-network,anon,tron,bithereum,safe-coin-2,genesis-network,bzedge,commercium,bitcoin-zero,zelcash,kadena,whale&order=market_cap_desc&per_page=100&page=1&sparkline=false'), // 3
      apiRequest('https://min-api.cryptocompare.com/data/pricemultifull?fsyms=BTC&tsyms=USD'), // give me price of BTC in USD 4
      //apiRequest('https://api.coingecko.com/api/v3/coins/markets?vs_currency=btc&ids=genesis-network&order=market_cap_desc&per_page=100&page=1&sparkline=false'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/markets?vs_currency=btc&ids=bzedge&order=market_cap_desc&per_page=100&page=1&sparkline=false'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/markets?vs_currency=btc&ids=commercium&order=market_cap_desc&per_page=100&page=1&sparkline=false'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/markets?vs_currency=btc&ids=bitcoin-zero&order=market_cap_desc&per_page=100&page=1&sparkline=false'),
      apiRequest('https://api.coinpaprika.com/v1/ticker/golf-golfcoin'),  // 5


    ]).then((results) => {
      var markets = [];
      var cmk = {};
      var errors = { errors: {} }

      //marketcap Data
      var ccDataFullA = results[0]; // full results from cryptocompare
      var ccDataFullB = results[1]; // full results from cryptocompare
      var ccDataFullC = results[2]; // full results from cryptocompare
      var ccDataFullD = results[3]; // full results from coingecko
      var btcPrice = results[4];
      var ccDataFullE = results[5]; // full results from coinpaprika
      // var btcPrice = results[4];
      // var btcInUsd = 5300;
      // try {
      //   btcInUsd = btcPrice.RAW.BTC.USD.PRICE;
      // } catch (e) {
      //   errors.errors.btcerror = results[4];
      // }

      var coinsFullA = Object.keys(ccDataFullA.RAW) // full results from cryptocompare
      coinsFullA.forEach((coin) => {
        try {
          var coindetail = {}
          coindetail['supply'] = ccDataFullA.RAW[coin].BTC.SUPPLY
          coindetail['volume'] = ccDataFullA.RAW[coin].BTC.TOTALVOLUME24HTO
          coindetail['change'] = ccDataFullA.RAW[coin].BTC.CHANGEPCT24HOUR
          coindetail['market'] = ccDataFullA.RAW[coin].BTC.MKTCAP
          cmk[coin] = coindetail
        } catch (e) {
          errors.errors.coinsFullA = results[0]
        }
      })

      var coinsFullB = Object.keys(ccDataFullB.RAW) // full results from cryptocompare
      coinsFullB.forEach((coin) => {
        try {
          var coindetail = {}
          coindetail['supply'] = ccDataFullB.RAW[coin].BTC.SUPPLY
          coindetail['volume'] = ccDataFullB.RAW[coin].BTC.TOTALVOLUME24HTO
          coindetail['change'] = ccDataFullB.RAW[coin].BTC.CHANGEPCT24HOUR
          coindetail['market'] = ccDataFullB.RAW[coin].BTC.MKTCAP
          cmk[coin] = coindetail
        } catch (e) {
          errors.errors.coinsFullB = results[1]
        }
      })

      var coinsFullC = Object.keys(ccDataFullC.RAW) // full results from cryptocompare
      coinsFullC.forEach((coin) => {
        try {
          var coindetail = {}
          coindetail['supply'] = ccDataFullC.RAW[coin].BTC.SUPPLY
          coindetail['volume'] = ccDataFullC.RAW[coin].BTC.TOTALVOLUME24HTO
          coindetail['change'] = ccDataFullC.RAW[coin].BTC.CHANGEPCT24HOUR
          coindetail['market'] = ccDataFullC.RAW[coin].BTC.MKTCAP
          cmk[coin] = coindetail
        } catch (e) {
          errors.errors.coinsFullC = results[2]
        }
      })

      var coinsFullD = Object.keys(ccDataFullD) // full results from coingecko
      coinsFullD.forEach((coin) => {
        try {
          var coindetail = {}
          coindetail['supply'] = ccDataFullD[coin].circulating_supply
          coindetail['volume'] = ccDataFullD[coin].total_volume
          coindetail['change'] = ccDataFullD[coin].price_change_percentage_24h
          coindetail['market'] = ccDataFullD[coin].market_cap
          cmk[ccDataFullD[coin].symbol.toUpperCase()] = coindetail
        } catch (e) {
          errors.errors.coinsFullD = results[3]
        }
      })

      try {
        var coindetail = {}
        coindetail['supply'] = Number(ccDataFullE.circulating_supply)
        coindetail['volume'] = Number(ccDataFullE.volume_24h_usd) / btcPrice.RAW.BTC.USD.PRICE
        coindetail['change'] = Number(ccDataFullE.percent_change_24h)
        coindetail['market'] = Number(ccDataFullE.market_cap_usd) / btcPrice.RAW.BTC.USD.PRICE
        cmk[ccDataFullE.symbol.toUpperCase()] = coindetail
      } catch (e) {
        errors.errors.coinsFullD = results[5]
      }
      cmk.ONG = cmk.ONGAS;
      cmk.SAI = cmk.DAI;
      cmk.TENT = cmk.XSG;

      markets.push(cmk);
      markets.push(errors);

      return markets;
    });
  },
};

module.exports = zelcoreMarkets;
