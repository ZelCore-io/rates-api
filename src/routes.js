const apicache = require('apicache');
const rate = require('./controllers/rate');
const market = require('./controllers/market');
const info = require('./controllers/info');

const cache = apicache.middleware;

module.exports = (app) => {
  app.get('/', (req, res) => {
    res.redirect('/rates');
  });
  app.get('/rates', cache('3 minutes'), rate.list);
  app.get('/markets', cache('3 minutes'), market.list);
  app.get('/info', cache('3 minutes'), info.list);
};
