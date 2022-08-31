const apicache = require('apicache');
const apiService = require('./services/apiServices');

const cache = apicache.middleware;

module.exports = (app) => {
  app.get('/', (req, res) => {
    res.redirect('/rates');
  });
  app.get('/rates', cache('2 minutes'), (req, res) => {
    apiService.getRates(req, res);
  });
  // app.get('/markets', cache('2 minutes'), (req, res) => {
  //   apiService.getMarkets(req, res);
  // });
  app.get('/marketsusd', cache('2 minutes'), (req, res) => {
    apiService.getMarketsUsd(req, res);
  });
};
