const apicache = require('apicache');
const rate = require('./controllers/rate');
const market = require('./controllers/market');

const cache = apicache.middleware;

module.exports = (app) => {
  app.get('/', (req, res) => {
    res.redirect('/rates');
  });
  app.get('/rates', cache('3 minutes'), rate.list);
  app.get('/markets', cache('3 minutes'), market.list);
};
