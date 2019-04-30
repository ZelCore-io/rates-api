const zelcoreRates = require('../services/zelcoreRates');
const log = require('../lib/log');

exports.list = (req, res, next) => {
  log.debug('Pulling Rates information from APIs');
  zelcoreRates.getAll().then((rates) => {
    res.json(rates);
  }).catch(next);
};
