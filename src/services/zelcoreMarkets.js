const request = require('request-promise-native');
var upperCase = require('upper-case')

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
      apiRequest('https://min-api.cryptocompare.com/data/pricemultifull?fsyms=TOK,CONI,PAX,GUSD,USDC,ETC,XMR,DASH,BTC,ETH,ZEC,USDT,LTC,BTCZ,RVN,BCH,BNB,BTX,SONM,OMG,ZIL,ZRX,GNT,SPHTX,BAT,MKR,KNC,ENG,PAY,SUB,CVC,STX,BTG,KCS,SRN,EVX,GTO,GVT,HOT,INS,IOTX,KEY,LUN,MDA,MITH,MTH,OAX,OST,PPT,QSP,REN,RLC,SNGLS,TNB,TNT,VIB,VIBE,WABI,WPR,DOCK,FUEL,CDT,CELR,CND,DATA,DGD,DLT,AGI&tsyms=BTC'),  //  0
      apiRequest('https://min-api.cryptocompare.com/data/pricemultifull?fsyms=HUSH,ZCL,XSG,BTCP,ZEN,KMD,XZC,ZER,ABT,ADX,AE,AION,AST,BBO,APPC,BLZ,BNT,ETHOS,COFI,DAI,DGX,ELEC,ELF,ENJ,STORJ,IOST,DENT,LEND,LINK,MANA,LRC,QASH,ICN,MCO,MTL,POE,POLY,POWR,RCN,REQ,SNT,SALT,STORM,EDO,TUSD,DCN,WAX,WINGS,DTA,FUN,KIN,BSV,AOA,THETA,ADT,MFT,ATL,ANT,ARN,BRD,REP,QKC,LOOM,ANON,EURS,AMB,BCPT&tsyms=BTC'), //  1
      apiRequest('https://min-api.cryptocompare.com/data/pricemultifull?fsyms=EOS,ADA,XRP,DOCK,NEO,BTT,SUQA,GRS,ZEL&tsyms=BTC'), // 2
      // marketinfo CoinGecko
      apiRequest('https://api.coingecko.com/api/v3/coins/markets?vs_currency=btc&ids=zencash,adex,fetch-ai,bitcoin-private,hush,raiden-network,anon,tron,bithereum,safe-coin-2,genesis-network,bzedge,commercium,bitcoin-zero,zelcash&order=market_cap_desc&per_page=100&page=1&sparkline=false'), // 3
      //apiRequest('https://api.coingecko.com/api/v3/coins/markets?vs_currency=btc&ids=genesis-network&order=market_cap_desc&per_page=100&page=1&sparkline=false'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/markets?vs_currency=btc&ids=bzedge&order=market_cap_desc&per_page=100&page=1&sparkline=false'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/markets?vs_currency=btc&ids=commercium&order=market_cap_desc&per_page=100&page=1&sparkline=false'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/markets?vs_currency=btc&ids=bitcoin-zero&order=market_cap_desc&per_page=100&page=1&sparkline=false'),

      
    ]).then((results) => {
      var markets = [];
      var cmk = {};
      var errors = { errors: {} }

      //marketcap Data
      var ccDataFullA = results[0]; // full results from cryptocompare
      var ccDataFullB = results[1]; // full results from cryptocompare
      var ccDataFullC = results[2]; // full results from cryptocompare
      var ccDataFullD = results[3]; // full results from coingecko

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
          coindetail['current_price'] = ccDataFullD[coin].current_price
          coindetail['circulating_supply'] = ccDataFullD[coin].circulating_supply
          coindetail['total_volume'] = ccDataFullD[coin].total_volume
          coindetail['price_change_percentage_24h'] = ccDataFullD[coin].price_change_percentage_24h
          coindetail['market_cap'] = ccDataFullD[coin].market_cap
          cmk[upperCase(ccDataFullD[coin].symbol)] = coindetail
        } catch (e) {
          errors.errors.coinsFullD = results[12]        
        }
      })

      markets.push(cmk);
      markets.push(errors);

      return markets;
    });
  },
};

module.exports = zelcoreMarkets;
