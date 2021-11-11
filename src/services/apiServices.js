const log = require('../lib/log');

const zelcoreRates = require('./zelcoreRates');
const zelcoreMarkets = require('./zelcoreMarkets');
const zelcoreMarketsUSD = require('./zelcoreMarketsUSD');

let rates = [];
let markets = [];
let marketsUSD = [];

async function getRates(req, res) {
  try {
    res.json(rates);
  } catch (error) {
    log.error(error);
  }
}

async function getMarkets(req, res) {
  try {
    res.json(markets);
  } catch (error) {
    log.error(error);
  }
}

async function getMarketsUsd(req, res) {
  try {
    res.json(marketsUSD);
  } catch (error) {
    log.error(error);
  }
}

async function serviceRefresher() {
  try {
    log.info('Refreshing Markets and Rates');
    const ratesFetched = await zelcoreRates.getAll();
    const marketsFetched = await zelcoreMarkets.getAll();
    const marketsUSDFetched = await zelcoreMarketsUSD.getAll();
    if (ratesFetched && ratesFetched[0] && ratesFetched[0].length > 20 && ratesFetched[1]) {
      if (Object.keys(ratesFetched[1]).length > 250) {
        rates = ratesFetched;
      }
    }
    if (marketsFetched && marketsFetched[0]) {
      if (Object.keys(marketsFetched[0].length > 250)) {
        markets = marketsFetched;
      }
    }
    if (marketsUSDFetched && marketsUSDFetched[0]) {
      if (Object.keys(marketsUSDFetched[0].length > 250)) {
        marketsUSD = marketsUSDFetched;
      }
    }
    log.info('Refreshment finished');
  } catch (error) {
    log.error(error);
  }
}

module.exports = {
  getRates,
  getMarkets,
  getMarketsUsd,
  serviceRefresher,
};
