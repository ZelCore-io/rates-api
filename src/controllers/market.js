const zelcoreMarkets = require('../services/zelcoreMarkets');
const log = require('../lib/log');

exports.list = (req, res, next) => {
  log.debug('Pulling Markets information from APIs');
  zelcoreMarkets.getAll().then((markets) => {
    res.json(markets);
  }).catch(next);
};
