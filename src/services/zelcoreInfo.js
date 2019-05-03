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
  getAll() {
    var infos = [];
    return Promise.all([
      //apiRequest(api_url),
      //  marketinfo
      //apiRequest('https://min-api.cryptocompare.com/data/pricemultifull?fsyms=ETC,XMR,DASH,BTC,ETH,ZEC,USDT,LTC,BTCZ,RVN,BCH,BNB,BTX,SONM,OMG,ZIL,ZRX,GNT,SPHTX,BAT,MKR,KNC,ENG,PAY,SUB,CVC,STX,BTG,KCS,SRN,EVX,GTO,GVT,HOT,INS,IOTX,KEY,LUN,MDA,MITH,MTH,OAX,OST,PPT,QSP,REN,RLC,SNGLS,TNB,TNT,VIB,VIBE,WABI,WPR,DOCK,FUEL,CDT,CELR,CND,DATA,DGD,DLT,AGI&tsyms=BTC'),  //  0
      //apiRequest('https://min-api.cryptocompare.com/data/pricemultifull?fsyms=HUSH,ZCL,XSG,BTCP,ZEN,KMD,XZC,ZER,ABT,ADX,AE,AION,AST,BBO,APPC,BLZ,BNT,ETHOS,COFI,DAI,DGX,ELEC,ELF,ENJ,STORJ,IOST,DENT,LEND,LINK,MANA,LRC,QASH,ICN,MCO,MTL,POE,POLY,POWR,RCN,REQ,SNT,SALT,STORM,EDO,TUSD,DCN,WAX,WINGS,DTA,FUN,KIN,BSV,AOA,THETA,ADT,MFT,ATL,ANT,ARN,BRD,REP,QKC,LOOM,ANON,EURS,AMB,BCPT&tsyms=BTC'), //  1
      //apiRequest('https://min-api.cryptocompare.com/data/pricemultifull?fsyms=EOS,ADA,XRP,DOCK,NEO,BTT,SUQA,GRS,ZEL&tsyms=BTC'), // 2
      
      
      // marketinfo CoinGecko
      
      //apiRequest('https://api.coingecko.com/api/v3/coins/usd-coin'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/gemini-dollar'),
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
       

      // -- DONE --
      //apiRequest('https://api.coingecko.com/api/v3/coins/tokok'),
      //''apiRequest('https://api.coingecko.com/api/v3/coins/coinbene-token'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/paxos-standard'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/gemini-dollar'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/usd-coin'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/ethereum-classic'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/monero'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/dash'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/bitcoin'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/ethereum'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/zcash'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/tether'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/litecoin'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/bitcoinz'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/ravencoin'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/bitcoin-cash'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/binancecoin'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/bitcore'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/sonm'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/omisego'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/zilliqa'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/0x'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/golem'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/sophiatx'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/basic-attention-token'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/maker'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/kyber-network'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/enigma'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/tenx'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/substratum'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/civic'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/stox'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/bitcoin-gold'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/kucoin-shares'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/sirin-labs-token'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/everex'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/fetch-ai'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/gifto'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/genesis-vision'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/holotoken'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/ins-ecosystem'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/iotex'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/selfkey'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/lunyr'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/moeda-loyalty-points'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/mithril'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/openanx'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/simple-token'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/populous'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/quantstamp'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/republic-protocol'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/iexec-rlc'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/singulardtv'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/time-new-bank'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/tierion'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/viberate'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/vibe'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/wabi'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/wepower'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/dock'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/etherparty'),
      ///apiRequest('https://api.coingecko.com/api/v3/coins/blox'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/celer-network'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/cindicator'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/data'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/digixdao'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/agrello'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/singularitynet'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/hush'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/zclassic'),
      //''apiRequest('https://api.coingecko.com/api/v3/coins/snowgem'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/bitcoin-private'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/zencash'),
      //''apiRequest('https://api.coingecko.com/api/v3/coins/komodo'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/zcoin'),
      //--apiRequest('https://api.coingecko.com/api/v3/coins/zero'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/arcblock'),
      //--apiRequest('https://api.coingecko.com/api/v3/coins/adex'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/aeternity'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/aion'),
      //--apiRequest('https://api.coingecko.com/api/v3/coins/airswap'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/bigbom-eco'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/appcoins'),
      //--apiRequest('https://api.coingecko.com/api/v3/coins/bluzelle'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/bancor'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/ethos'),
      //''apiRequest('https://api.coingecko.com/api/v3/coins/coinfi'),
      //--apiRequest('https://api.coingecko.com/api/v3/coins/dai'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/digix-gold'),
      //--apiRequest('https://api.coingecko.com/api/v3/coins/electrify-asia'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/aelf'),
      //--apiRequest('https://api.coingecko.com/api/v3/coins/enjincoin'),
      //--apiRequest('https://api.coingecko.com/api/v3/coins/storj'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/iostoken'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/dent'),
     //'' apiRequest('https://api.coingecko.com/api/v3/coins/ethlend'),
      //--apiRequest('https://api.coingecko.com/api/v3/coins/link'),
      //--apiRequest('https://api.coingecko.com/api/v3/coins/decentraland'),
      //''apiRequest('https://api.coingecko.com/api/v3/coins/loopring'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/qash'),
      //''apiRequest('https://api.coingecko.com/api/v3/coins/monaco'),
      //''apiRequest('https://api.coingecko.com/api/v3/coins/metal'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/poet'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/polymath-network'),
      //''apiRequest('https://api.coingecko.com/api/v3/coins/power-ledger'),
      //--apiRequest('https://api.coingecko.com/api/v3/coins/ripio-credit-network'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/raiden-network'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/request-network'),
      //''apiRequest('https://api.coingecko.com/api/v3/coins/status'),
      //--apiRequest('https://api.coingecko.com/api/v3/coins/salt'),
      //''apiRequest('https://api.coingecko.com/api/v3/coins/storm'),
      //--apiRequest('https://api.coingecko.com/api/v3/coins/eidoo'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/true-usd'),
      //--apiRequest('https://api.coingecko.com/api/v3/coins/dentacoin'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/wax'),
      //''apiRequest('https://api.coingecko.com/api/v3/coins/wings'),
      //--apiRequest('https://api.coingecko.com/api/v3/coins/data'),
      //--apiRequest('https://api.coingecko.com/api/v3/coins/funfair'),
      //--apiRequest('https://api.coingecko.com/api/v3/coins/kin'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/bitcoin-cash-sv'),
      //''apiRequest('https://api.coingecko.com/api/v3/coins/aurora'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/theta-token'),
      //--apiRequest('https://api.coingecko.com/api/v3/coins/adtoken'),
      //--apiRequest('https://api.coingecko.com/api/v3/coins/mainframe'),
      //--apiRequest('https://api.coingecko.com/api/v3/coins/atlant'),
      //--apiRequest('https://api.coingecko.com/api/v3/coins/aeron'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/bread'),
      //''apiRequest('https://api.coingecko.com/api/v3/coins/augur'),
      //''apiRequest('https://api.coingecko.com/api/v3/coins/quark-chain'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/loom-network'),
      //''apiRequest('https://api.coingecko.com/api/v3/coins/anon'),
      //--apiRequest('https://api.coingecko.com/api/v3/coins/stasis-eurs'),
      //''apiRequest('https://api.coingecko.com/api/v3/coins/amber'),
      //--apiRequest('https://api.coingecko.com/api/v3/coins/blockmason-credit-protocol'),
      //''apiRequest('https://api.coingecko.com/api/v3/coins/eos'),
     // apiRequest('https://api.coingecko.com/api/v3/coins/cardano'),
      //--apiRequest('https://api.coingecko.com/api/v3/coins/ripple'),
      //--apiRequest('https://api.coingecko.com/api/v3/coins/dock'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/neo'),
     //'' apiRequest('https://api.coingecko.com/api/v3/coins/tron'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/blocktrade'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/bitcoin-zero'),
      //--apiRequest('https://api.coingecko.com/api/v3/coins/gunthy'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/groestlcoin'),
      //--apiRequest('https://api.coingecko.com/api/v3/coins/commercium'),
      //apiRequest('https://api.coingecko.com/api/v3/coins/bithereum'),
     //'' apiRequest('https://api.coingecko.com/api/v3/coins/genesis-network'),
      //--apiRequest('https://api.coingecko.com/api/v3/coins/suqa'),

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
