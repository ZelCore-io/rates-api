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


var zelcoreInfo = {
  getAll(api_url) {
    var infos = [];
    return Promise.all([
      apiRequest(api_url),
      //  marketinfo
      //apiRequest('https://min-api.cryptocompare.com/data/pricemultifull?fsyms=ETC,XMR,DASH,BTC,ETH,ZEC,USDT,LTC,BTCZ,RVN,BCH,BNB,BTX,SONM,OMG,ZIL,ZRX,GNT,SPHTX,BAT,MKR,KNC,ENG,PAY,SUB,CVC,STX,BTG,KCS,SRN,EVX,GTO,GVT,HOT,INS,IOTX,KEY,LUN,MDA,MITH,MTH,OAX,OST,PPT,QSP,REN,RLC,SNGLS,TNB,TNT,VIB,VIBE,WABI,WPR,DOCK,FUEL,CDT,CELR,CND,DATA,DGD,DLT,AGI&tsyms=BTC'),  //  0
      //apiRequest('https://min-api.cryptocompare.com/data/pricemultifull?fsyms=HUSH,ZCL,XSG,BTCP,ZEN,KMD,XZC,ZER,ABT,ADX,AE,AION,AST,BBO,APPC,BLZ,BNT,ETHOS,COFI,DAI,DGX,ELEC,ELF,ENJ,STORJ,IOST,DENT,LEND,LINK,MANA,LRC,QASH,ICN,MCO,MTL,POE,POLY,POWR,RCN,REQ,SNT,SALT,STORM,EDO,TUSD,DCN,WAX,WINGS,DTA,FUN,KIN,BSV,AOA,THETA,ADT,MFT,ATL,ANT,ARN,BRD,REP,QKC,LOOM,ANON,EURS,AMB,BCPT&tsyms=BTC'), //  1
      //apiRequest('https://min-api.cryptocompare.com/data/pricemultifull?fsyms=EOS,ADA,XRP,DOCK,NEO,BTT,SUQA,GRS,ZEL&tsyms=BTC'), // 2
      
      
      // marketinfo CoinGecko
      
      // apiRequest('https://api.coingecko.com/api/v3/coins/usd-coin'),
      // apiRequest('https://api.coingecko.com/api/v3/coins/gemini-dollar'),
      // apiRequest('https://api.coingecko.com/api/v3/coins/paxos-standard'),
      // apiRequest('https://api.coingecko.com/api/v3/coins/tokok'),
      // apiRequest('https://api.coingecko.com/api/v3/coins/coinbene-token'),
      // apiRequest('https://api.coingecko.com/api/v3/coins/zencash'),
      // apiRequest('https://api.coingecko.com/api/v3/coins/adex'),
      // apiRequest('https://api.coingecko.com/api/v3/coins/fetch-ai'),
      // apiRequest('https://api.coingecko.com/api/v3/coins/bitcoin-private'),
      // apiRequest('https://api.coingecko.com/api/v3/coins/hush'),
      // apiRequest('https://api.coingecko.com/api/v3/coins/raiden-network'),

      // apiRequest('https://api.coingecko.com/api/v3/coins/anon'),
      // apiRequest('https://api.coingecko.com/api/v3/coins/tron'),
      // apiRequest('https://api.coingecko.com/api/v3/coins/bithereum'),
      // apiRequest('https://api.coingecko.com/api/v3/coins/safe-coin-2'),
      // apiRequest('https://api.coingecko.com/api/v3/coins/genesis-network'),
      // apiRequest('https://api.coingecko.com/api/v3/coins/bzedge'),
      // apiRequest('https://api.coingecko.com/api/v3/coins/commercium'),
      // apiRequest('https://api.coingecko.com/api/v3/coins/bitcoin-zero'),
       
    ]).then((results) => {
      
      var nfo = {};
      var errors = { errors: {} }

      //marketcap Data
      //foreach result in results{

      results.forEach((result) => {
      
      var ccDataFullInfo = result; // full results from coingecko
      
      var coinsFullInfo = Object.keys(ccDataFullInfo) // full results from coingecko       
      try {
        var coindetail ={}
        coindetail['id'] = ccDataFullInfo.id
        coindetail['unit'] = ccDataFullInfo.symbol
        coindetail['name'] = ccDataFullInfo.name
        coindetail['description'] = ccDataFullInfo.description.en
        coindetail['links'] = ccDataFullInfo.links
        nfo[ccDataFullInfo.symbol.toUpperCase()] = coindetail
      } catch (e) {
        errors.errors.coinsFullInfo = result       
      }
        })
      infos.push(nfo);
      infos.push(errors);

      return infos;
  

    })
    
  },
};

module.exports = zelcoreInfo;
