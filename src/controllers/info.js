const zelcoreInfo = require('../services/zelcoreInfo');
const log = require('../lib/log');

exports.list = (req, res, next) => {
  var infoJson = {};
  infoJson['coin'] = []
  coins = [
      'https://api.coingecko.com/api/v3/coins/zelcash',
      'https://api.coingecko.com/api/v3/coins/usd-coin',
      'https://api.coingecko.com/api/v3/coins/gemini-dollar',
      'https://api.coingecko.com/api/v3/coins/paxos-standard',
      'https://api.coingecko.com/api/v3/coins/tokok',
      'https://api.coingecko.com/api/v3/coins/coinbene-token',
      'https://api.coingecko.com/api/v3/coins/zencash',
      'https://api.coingecko.com/api/v3/coins/adex',
      'https://api.coingecko.com/api/v3/coins/fetch-ai',
      'https://api.coingecko.com/api/v3/coins/bitcoin-private',
      'https://api.coingecko.com/api/v3/coins/hush',
      'https://api.coingecko.com/api/v3/coins/raiden-network',
      'https://api.coingecko.com/api/v3/coins/anon',
      'https://api.coingecko.com/api/v3/coins/tron',
      'https://api.coingecko.com/api/v3/coins/bithereum',
      'https://api.coingecko.com/api/v3/coins/safe-coin-2',
      'https://api.coingecko.com/api/v3/coins/genesis-network',
      'https://api.coingecko.com/api/v3/coins/bzedge',
      'https://api.coingecko.com/api/v3/coins/commercium',
      'https://api.coingecko.com/api/v3/coins/bitcoin-zero',
      ''

  ]
  log.debug('Pulling Coin information from APIs');

  // //hoping to loop through the array of url's to get a big json
  // coins.forEach(function(coin){
  //     zelcoreInfo.getAll(coin).then((infos) => {
  //       infoJson['coin'].push(infos);
  //     });   
  // });
  
  // --------------------------------------------------------------------



  zelcoreInfo.getAll().then((infos) => {
     //infoJson['coin'].push(infos);
     res.json(infos);
    
  }).catch(next);

};
