const apicache = require('apicache');
const rate = require('./controllers/rate');
const market = require('./controllers/market');
const marketusd = require('./controllers/marketusd');

const cache = apicache.middleware;

module.exports = (app) => {
  app.get('/', (req, res) => {
    res.redirect('/rates');
  });
  app.get('/rates', cache('7 minutes'), rate.list);
  app.get('/markets', cache('7 minutes'), market.list);
  app.get('/marketsusd', cache('7 minutes'), marketusd.list);
};
